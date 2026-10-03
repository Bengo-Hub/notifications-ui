import { apiClient } from './client';

/** A platform "what's new" banner shown on the apps' dashboards (notifications-api). */
export interface Announcement {
    id: string;
    title: string;
    summary: string;
    highlights?: string[];
    cta_label?: string;
    cta_url?: string;
    services?: string[];
    audience: 'all' | 'admins';
    tone: 'feature' | 'info' | 'warning';
    priority: number;
    dismissible: boolean;
    is_active: boolean;
    starts_at: string;
    ends_at?: string | null;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface AnnouncementInput {
    title: string;
    summary: string;
    highlights: string[];
    cta_label: string;
    cta_url: string;
    services: string[];
    audience: 'all' | 'admins';
    tone: 'feature' | 'info' | 'warning';
    priority: number;
    dismissible: boolean;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
}

export const announcementsApi = {
    list: () => apiClient.get<{ announcements: Announcement[] }>('/api/v1/platform/announcements'),
    create: (body: AnnouncementInput) => apiClient.post<Announcement>('/api/v1/platform/announcements', body),
    update: (id: string, body: AnnouncementInput) => apiClient.put<Announcement>(`/api/v1/platform/announcements/${id}`, body),
    remove: (id: string) => apiClient.delete<void>(`/api/v1/platform/announcements/${id}`),
};
