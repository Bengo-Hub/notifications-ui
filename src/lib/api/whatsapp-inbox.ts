import { apiClient } from './client';
import type { PaginatedResponse } from './templates';

export interface WhatsAppConversation {
    id: string;
    customer_wa_id: string;
    customer_name?: string;
    last_message_at: string;
    last_message_preview?: string;
    unread_count: number;
    window_open: boolean;
    window_expires_at?: string;
}

export interface WhatsAppMessage {
    id: string;
    direction: 'inbound' | 'outbound';
    body: string;
    status: string;
    created_at: string;
    sent_by_user_id?: string;
}

export const whatsappInboxApi = {
    listConversations: (params?: { page?: number; limit?: number }) => {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        const qs = q.toString();
        return apiClient.get<PaginatedResponse<WhatsAppConversation>>(
            `/api/v1/whatsapp/conversations${qs ? `?${qs}` : ''}`
        );
    },

    listMessages: (conversationId: string, params?: { page?: number; limit?: number }) => {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        const qs = q.toString();
        return apiClient.get<PaginatedResponse<WhatsAppMessage>>(
            `/api/v1/whatsapp/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`
        );
    },

    markRead: (conversationId: string) =>
        apiClient.post<{ message: string }>(`/api/v1/whatsapp/conversations/${conversationId}/read`, {}),

    reply: (conversationId: string, body: string) =>
        apiClient.post<WhatsAppMessage>(`/api/v1/whatsapp/conversations/${conversationId}/messages`, { body }),
};
