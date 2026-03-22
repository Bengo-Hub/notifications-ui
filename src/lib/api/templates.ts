import { apiClient } from './client';

export interface NotificationTemplate {
    id: string;
    name: string;
    type: 'email' | 'sms' | 'push';
    subject?: string;
    content: string;
    updatedAt: string;
    tags?: string[];
}

/** API returns { templates: [{ id, channel, tags }] }; map to NotificationTemplate[] */
export const templatesApi = {
    list: async (): Promise<NotificationTemplate[]> => {
        const res = await apiClient.get<{ templates: { id: string; channel: string; tags?: string[] }[] }>('/api/v1/templates');
        const list = res?.templates ?? [];
        return list.map((t) => ({
            id: t.id,
            name: t.id,
            type: t.channel as 'email' | 'sms' | 'push',
            content: '',
            updatedAt: new Date().toISOString(),
            tags: t.tags ?? [],
        }));
    },
    get: (id: string, channel: string) =>
        apiClient.get<{ id: string; channel: string; content: string; mimeType: string }>(
            `/api/v1/templates/${id}?channel=${channel}`
        ),
    update: (id: string, channel: string, data: { content: string; subject?: string }) =>
        apiClient.put<{ id: string; channel: string; content: string; mimeType: string }>(
            `/api/v1/templates/${id}?channel=${channel}`,
            { content: data.content, subject: data.subject }
        ),
    testSend: (id: string, channel: string, to: string[], data?: Record<string, unknown>) =>
        apiClient.post<{ status: string; requestId: string }>(
            `/api/v1/templates/${id}/test`,
            { channel, to, data: data ?? {} }
        ),
};
