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

export const templatesApi = {
    list: (orgSlug: string) => apiClient.get<NotificationTemplate[]>(`/api/v1/templates/${orgSlug}`),
    get: (id: string) => apiClient.get<NotificationTemplate>(`/api/v1/templates/detail/${id}`),
    create: (data: Partial<NotificationTemplate>) => apiClient.post<NotificationTemplate>('/api/v1/templates', data),
    update: (id: string, data: Partial<NotificationTemplate>) => apiClient.patch<NotificationTemplate>(`/api/v1/templates/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/v1/templates/${id}`),
};
