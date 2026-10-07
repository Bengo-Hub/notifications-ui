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

const base = (scope: BannerScope) => (scope === 'platform' ? '/api/v1/platform/announcements' : '/api/v1/announcements');

export const announcementsApi = {
    list: (scope: BannerScope = 'platform') => apiClient.get<{ announcements: Announcement[] }>(base(scope)),
    create: (body: AnnouncementInput, scope: BannerScope = 'platform') => apiClient.post<Announcement>(base(scope), body),
    update: (id: string, body: AnnouncementInput, scope: BannerScope = 'platform') => apiClient.put<Announcement>(`${base(scope)}/${id}`, body),
    remove: (id: string, scope: BannerScope = 'platform') => apiClient.delete<void>(`${base(scope)}/${id}`),
};
