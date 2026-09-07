'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { whatsappInboxKeys } from './use-whatsapp-inbox';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://notificationsapi.codevertexafrica.com';
const PING_INTERVAL_MS = 25_000;
const RECONNECT_MIN_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

function wsUrl(token: string): string {
    const url = new URL(API_BASE_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/api/v1/whatsapp/conversations/stream';
    url.searchParams.set('access_token', token);
    return url.toString();
}

/**
 * Live-updates the WhatsApp inbox over a WebSocket — a new inbound message or a staff reply
 * anywhere in the tenant invalidates the conversation list (and the open thread, if any) so
 * TanStack Query refetches immediately instead of waiting on the polling interval. Reconnects
 * with backoff; sends a client ping every 25s since no nginx-ingress idle-timeout override exists
 * fleet-wide (see pos-ui's use-notification-stream.ts, the pattern this mirrors).
 */
export function useWhatsAppInboxStream(openConversationId?: string) {
    const qc = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backoffRef = useRef(RECONNECT_MIN_MS);
    const openConversationRef = useRef(openConversationId);
    openConversationRef.current = openConversationId;

    useEffect(() => {
        let cancelled = false;

        const connect = () => {
            if (cancelled) return;
            const token = useAuthStore.getState().session?.accessToken;
            if (!token) {
                reconnectRef.current = setTimeout(connect, RECONNECT_MIN_MS);
                return;
            }

            const ws = new WebSocket(wsUrl(token));
            wsRef.current = ws;

            ws.onopen = () => {
                backoffRef.current = RECONNECT_MIN_MS;
                pingRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
                }, PING_INTERVAL_MS);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type !== 'whatsapp_message') return;
                    qc.invalidateQueries({ queryKey: whatsappInboxKeys.all() });
                    const conversationId = msg.payload?.conversation_id;
                    if (conversationId && conversationId === openConversationRef.current) {
                        qc.invalidateQueries({ queryKey: whatsappInboxKeys.messages(conversationId) });
                    }
                } catch {
                    // ignore malformed frames (e.g. the server's own ping/pong)
                }
            };

            const scheduleReconnect = () => {
                if (pingRef.current) clearInterval(pingRef.current);
                if (cancelled) return;
                reconnectRef.current = setTimeout(connect, backoffRef.current);
                backoffRef.current = Math.min(backoffRef.current * 2, RECONNECT_MAX_MS);
            };
            ws.onclose = scheduleReconnect;
            ws.onerror = () => ws.close();
        };

        connect();

        return () => {
            cancelled = true;
            if (pingRef.current) clearInterval(pingRef.current);
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            wsRef.current?.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
