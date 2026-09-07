'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappInboxApi } from '@/lib/api/whatsapp-inbox';

// The WebSocket stream (use-whatsapp-inbox-stream.ts) drives real-time updates by invalidating
// these queries directly — this polling interval is only a safety net for a dropped/reconnecting
// socket, not the primary update mechanism.
const CONVERSATIONS_POLL_MS = 60_000;
const MESSAGES_POLL_MS = 45_000;

export const whatsappInboxKeys = {
    all: () => ['whatsapp-conversations'] as const,
    list: (params?: { page?: number; limit?: number }) => [...whatsappInboxKeys.all(), 'list', params ?? {}] as const,
    messages: (conversationId: string) => [...whatsappInboxKeys.all(), conversationId, 'messages'] as const,
};

export function useConversations(params?: { page?: number; limit?: number }) {
    return useQuery({
        queryKey: whatsappInboxKeys.list(params),
        queryFn: () => whatsappInboxApi.listConversations(params),
        refetchInterval: CONVERSATIONS_POLL_MS,
    });
}

export function useConversationMessages(conversationId: string, enabled = true) {
    return useQuery({
        queryKey: whatsappInboxKeys.messages(conversationId),
        queryFn: () => whatsappInboxApi.listMessages(conversationId),
        enabled: enabled && !!conversationId,
        refetchInterval: enabled ? MESSAGES_POLL_MS : false,
    });
}

export function useSendReply(conversationId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: string) => whatsappInboxApi.reply(conversationId, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: whatsappInboxKeys.messages(conversationId) });
            qc.invalidateQueries({ queryKey: whatsappInboxKeys.all() });
        },
    });
}

export function useMarkRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (conversationId: string) => whatsappInboxApi.markRead(conversationId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: whatsappInboxKeys.all() });
        },
    });
}
