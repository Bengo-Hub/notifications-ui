'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappInboxApi } from '@/lib/api/whatsapp-inbox';

// Conversations poll every 15s — cheap fallback for live-update until the websocket stream ships
// (Part A-3 of the plan); messages poll faster only while a thread is actually open.
const CONVERSATIONS_POLL_MS = 15_000;
const MESSAGES_POLL_MS = 8_000;

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
