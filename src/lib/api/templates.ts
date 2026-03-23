import { apiClient } from './client';

export interface NotificationTemplate {
    id: string;
    name: string;
    channel: 'email' | 'sms' | 'push' | 'whatsapp';
    category: string;
    tags: string[];
    variables: string[];
    mimeType: string;
    description?: string;
    filePath: string;
    // Compat fields used by editor page
    type?: 'email' | 'sms' | 'push' | 'whatsapp';
    subject?: string;
    content?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    limit: number;
    page: number;
    hasMore: boolean;
}

export interface TemplateListParams {
    page?: number;
    limit?: number;
    channel?: string;
    category?: string;
    tag?: string;
    search?: string;
}

/** API returns paginated { data, total, limit, page, hasMore } */
export const templatesApi = {
    list: async (params?: TemplateListParams): Promise<PaginatedResponse<NotificationTemplate>> => {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        if (params?.channel) q.set('channel', params.channel);
        if (params?.category) q.set('category', params.category);
        if (params?.tag) q.set('tag', params.tag);
        if (params?.search) q.set('search', params.search);
        const qs = q.toString();
        const url = `/api/v1/templates${qs ? `?${qs}` : ''}`;
        const res = await apiClient.get<PaginatedResponse<NotificationTemplate>>(url);
        // Normalize: add compat 'type' field from 'channel'
        const data = (res?.data ?? []).map((t) => ({
            ...t,
            type: t.channel,
            tags: t.tags ?? [],
            variables: t.variables ?? [],
        }));
        return {
            data,
            total: res?.total ?? 0,
            limit: res?.limit ?? 20,
            page: res?.page ?? 1,
            hasMore: res?.hasMore ?? false,
        };
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
