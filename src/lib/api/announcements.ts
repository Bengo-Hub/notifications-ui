import { apiClient } from './client';

/** Who owns the banners being managed: the platform (every tenant sees them) or the acting tenant. */
export type BannerScope = 'platform' | 'tenant';

/** A dashboard banner shown on the apps (notifications-api). */
export interface Announcement {
    id: string;
    tenant_id?: string | null;
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

// One route set: the server decides whose banners these are from the acting tenant (the platform
// tenant acting as itself manages the platform's banners, shown to every tenant).
const base = '/api/v1/announcements';

export const announcementsApi = {
    list: () => apiClient.get<{ announcements: Announcement[] }>(base),
    create: (body: AnnouncementInput) => apiClient.post<Announcement>(base, body),
    update: (id: string, body: AnnouncementInput) => apiClient.put<Announcement>(`${base}/${id}`, body),
    remove: (id: string) => apiClient.delete<void>(`${base}/${id}`),
};
