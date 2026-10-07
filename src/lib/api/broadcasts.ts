import { apiClient } from './client';

/** Who is sending: the platform (to its tenants) or the acting tenant (to its customers or staff). */
export type SendScope = 'platform' | 'tenant';

export type BroadcastStatus =
    | 'draft' | 'pending_approval' | 'scheduled' | 'sending' | 'paused'
    | 'completed' | 'cancelled' | 'rejected' | 'failed';

export type Channel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app';

export interface BroadcastContent {
    email?: { subject: string; body: string };
    sms?: { body: string };
    whatsapp?: { template: string; params: string[]; message?: string };
    push?: { title: string; body: string };
    in_app?: { title: string; summary: string; cta_label?: string; cta_url?: string; services?: string[]; audience?: 'all' | 'admins'; tone?: string; days?: number };
}

export interface Broadcast {
    id: string;
    scope: SendScope;
    tenant_id?: string | null;
    kind: 'announcement' | 'greeting' | 'marketing' | 'service_notice';
    class: 'marketing' | 'transactional';
    status: BroadcastStatus;
    title: string;
    channels: Channel[];
    content: BroadcastContent;
    audience: { type?: string; segment_id?: string; filters?: Record<string, unknown> };
    send_at?: string | null;
    occasion_id?: string | null;
    occasion_year?: number | null;
    requested_by?: string;
    approved_by?: string;
    approved_at?: string | null;
    target_count: number;
    sent_count: number;
    failed_count: number;
    skipped_count: number;
    suppressed_count: number;
    metadata?: Record<string, unknown>;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
    progress: number;
}

export interface BroadcastInput {
    title: string;
    kind: Broadcast['kind'];
    class?: Broadcast['class'];
    channels: Channel[];
    content: BroadcastContent;
    audience: Broadcast['audience'];
    send_at?: string | null;
    sender_name?: string;
    timezone?: string;
    consent_attested?: boolean;
}

export interface Recipient {
    id: string;
    channel: string;
    address: string;
    display_name: string;
    status: string;
    error?: string;
    attempts: number;
    sent_at?: string | null;
}

export interface OccasionVariant { subject: string; body: string; sms: string }

export interface OccasionSettings {
    enabled: boolean;
    auto_send: boolean;
    channels: Channel[];
    audience?: string;
    segment_id?: string;
    send_time?: string;
    whatsapp_template?: string;
    variants: OccasionVariant[];
}

export interface Occasion {
    id: string;
    key: string;
    name: string;
    country: string;
    rule: Record<string, unknown>;
    duration_days: number;
    lead_days: number;
    send_offset_days: number;
    custom: boolean;
    customised: boolean;
    settings: OccasionSettings;
    next_date?: string;
    needs_date: boolean;
}

export type BroadcastAction = 'submit' | 'approve' | 'reject' | 'pause' | 'resume' | 'cancel';

/** One person in the recipient review: masked address per channel, or why it would not send. */
export interface ReviewRow {
    key: string;
    name: string;
    business_name?: string;
    excluded: boolean;
    channels: Record<string, { address: string; sends: boolean; reason?: string }>;
}

// One route set for every sender. The server decides the scope from the acting tenant: the
// platform tenant acting as itself is the platform (its audience is the tenants); any other tenant
// sends to its own customers or staff. summary() reports which one the UI is in.
const root = '/api/v1';

export const broadcastsApi = {
    list: (params: { status?: string; occasion?: boolean; limit?: number; offset?: number }) =>
        apiClient.get<{ data: Broadcast[]; total: number }>(`${root}/broadcasts`, params),
    summary: () => apiClient.get<{ pending_approval: number; scope: SendScope; sender_name: string }>(`${root}/broadcasts/summary`),
    get: (id: string) =>
        apiClient.get<{ broadcast: Broadcast; channels: Record<string, Record<string, number>> }>(`${root}/broadcasts/${id}`),
    create: (body: BroadcastInput) => apiClient.post<Broadcast>(`${root}/broadcasts`, body),
    update: (id: string, body: BroadcastInput) => apiClient.put<Broadcast>(`${root}/broadcasts/${id}`, body),
    remove: (id: string) => apiClient.delete<void>(`${root}/broadcasts/${id}`),
    act: (id: string, action: BroadcastAction, note?: string) =>
        apiClient.post<Broadcast>(`${root}/broadcasts/${id}/${action}`, { note }),
    estimate: (id: string) =>
        apiClient.post<{ people: number; left_out: number; reachable: Record<string, number>; at_least: boolean }>(`${root}/broadcasts/${id}/estimate`),
    audience: (id: string, params: { after?: string; limit?: number }) =>
        apiClient.get<{ data: ReviewRow[]; next: string; left_out: number }>(`${root}/broadcasts/${id}/audience`, params),
    setExclusions: (id: string, body: { exclude?: string[]; include?: string[] }) =>
        apiClient.put<{ left_out: number }>(`${root}/broadcasts/${id}/exclusions`, body),
    recipients: (id: string, params: { status?: string; channel?: string; limit?: number; offset?: number }) =>
        apiClient.get<{ data: Recipient[]; total: number }>(`${root}/broadcasts/${id}/recipients`, params),
    preview: (texts: Record<string, string>, sample?: { first_name?: string; business_name?: string; occasion?: string }) =>
        apiClient.post<{ rendered: Record<string, string>; sender_name: string }>(`${root}/broadcasts/preview`, { texts, ...sample }),
    whatsappTemplates: () =>
        apiClient.get<{ templates: { name: string; params: string[] }[] }>(`${root}/broadcasts/whatsapp-templates`),

    occasions: () => apiClient.get<{ data: Occasion[] }>(`${root}/occasions`),
    saveOccasion: (key: string, body: { name?: string; rule?: Record<string, unknown>; lead_days?: number; send_offset_days?: number; settings?: OccasionSettings }) =>
        apiClient.put<Occasion>(`${root}/occasions/${key}`, body),
    deleteOccasion: (key: string) => apiClient.delete<void>(`${root}/occasions/${key}`),
    draftOccasion: (key: string) => apiClient.post<Broadcast>(`${root}/occasions/${key}/draft`),
};
