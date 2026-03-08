import { apiClient } from './client';

export interface NotificationTemplate {
    id: string;
    name: string;
    type: 'email' | 'sms' | 'push';
    subject?: string;
    content: string;
    organizationId: string;
    updatedAt: string;
}

/** API returns { templates: [{ id, channel }] }; map to NotificationTemplate[] */
export const templatesApi = {
    list: async (orgSlug: string): Promise<NotificationTemplate[]> => {
        const res = await apiClient.get<{ templates: { id: string; channel: string }[] }>(`/api/v1/${orgSlug}/templates`);
        const list = res?.templates ?? [];
        return list.map((t) => ({
            id: t.id,
            name: t.id,
            type: t.channel as 'email' | 'sms' | 'push',
            content: '',
            organizationId: orgSlug,
            updatedAt: new Date().toISOString(),
        }));
    },
    get: (orgSlug: string, id: string, channel: string) =>
        apiClient.get<{ id: string; channel: string; content: string; mimeType: string }>(
            `/api/v1/${orgSlug}/templates/${id}?channel=${channel}`
        ),
    update: (orgSlug: string, id: string, channel: string, data: { content: string; subject?: string }) =>
        apiClient.put<{ id: string; channel: string; content: string; mimeType: string }>(
            `/api/v1/${orgSlug}/templates/${id}?channel=${channel}`,
            { content: data.content, subject: data.subject }
        ),
    testSend: (orgSlug: string, id: string, channel: string, to: string[], data?: Record<string, unknown>) =>
        apiClient.post<{ status: string; requestId: string }>(
            `/api/v1/${orgSlug}/templates/${id}/test`,
            { channel, to, data: data ?? {} }
        ),
};
