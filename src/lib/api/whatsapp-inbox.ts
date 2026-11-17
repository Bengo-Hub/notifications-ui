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

/** The support ticket a customer message was turned into (ticketing-api owns it). */
export interface ConvertedTicket {
    ticket_id: string;
    ticket_number: string;
    status: string;
    /** false when the message already had a ticket (converted before, or opened by auto-ticketing). */
    created: boolean;
    /** The ticket in the ticketing console; absent when the tenant slug is unknown. */
    url?: string;
}

export const whatsappInboxApi = {
    /** Whether this workspace's plan includes ticketing, so the inbox offers Convert to ticket. */
    ticketingStatus: () => apiClient.get<{ available: boolean }>('/api/v1/whatsapp/conversations/ticketing'),

    /**
     * Opens (or finds) the support ticket for one customer message, or for the conversation's
     * latest customer message when no message id is given. Safe to repeat: the same message
     * always answers with the same ticket.
     */
    convertToTicket: (conversationId: string, messageId?: string) =>
        apiClient.post<ConvertedTicket>(
            `/api/v1/whatsapp/conversations/${conversationId}/ticket`,
            messageId ? { message_id: messageId } : {}
        ),

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
