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

const root = (scope: SendScope) => (scope === 'platform' ? '/api/v1/platform' : '/api/v1');

export const broadcastsApi = {
    list: (scope: SendScope, params: { status?: string; occasion?: boolean; limit?: number; offset?: number }) =>
        apiClient.get<{ data: Broadcast[]; total: number }>(`${root(scope)}/broadcasts`, params),
    summary: (scope: SendScope) => apiClient.get<{ pending_approval: number }>(`${root(scope)}/broadcasts/summary`),
    get: (scope: SendScope, id: string) =>
        apiClient.get<{ broadcast: Broadcast; channels: Record<string, Record<string, number>> }>(`${root(scope)}/broadcasts/${id}`),
    create: (scope: SendScope, body: BroadcastInput) => apiClient.post<Broadcast>(`${root(scope)}/broadcasts`, body),
    update: (scope: SendScope, id: string, body: BroadcastInput) => apiClient.put<Broadcast>(`${root(scope)}/broadcasts/${id}`, body),
    remove: (scope: SendScope, id: string) => apiClient.delete<void>(`${root(scope)}/broadcasts/${id}`),
    act: (scope: SendScope, id: string, action: BroadcastAction, note?: string) =>
        apiClient.post<Broadcast>(`${root(scope)}/broadcasts/${id}/${action}`, { note }),
    estimate: (scope: SendScope, id: string) =>
        apiClient.post<{ people: number; reachable: Record<string, number>; at_least: boolean }>(`${root(scope)}/broadcasts/${id}/estimate`),
    recipients: (scope: SendScope, id: string, params: { status?: string; channel?: string; limit?: number; offset?: number }) =>
        apiClient.get<{ data: Recipient[]; total: number }>(`${root(scope)}/broadcasts/${id}/recipients`, params),
    preview: (scope: SendScope, texts: Record<string, string>, sample?: { first_name?: string; business_name?: string; occasion?: string }) =>
        apiClient.post<{ rendered: Record<string, string>; sender_name: string }>(`${root(scope)}/broadcasts/preview`, { texts, ...sample }),
    whatsappTemplates: (scope: SendScope) =>
        apiClient.get<{ templates: { name: string; params: string[] }[] }>(`${root(scope)}/broadcasts/whatsapp-templates`),

    occasions: (scope: SendScope) => apiClient.get<{ data: Occasion[] }>(`${root(scope)}/occasions`),
    saveOccasion: (scope: SendScope, key: string, body: { name?: string; rule?: Record<string, unknown>; lead_days?: number; send_offset_days?: number; settings?: OccasionSettings }) =>
        apiClient.put<Occasion>(`${root(scope)}/occasions/${key}`, body),
    deleteOccasion: (scope: SendScope, key: string) => apiClient.delete<void>(`${root(scope)}/occasions/${key}`),
    draftOccasion: (scope: SendScope, key: string) => apiClient.post<Broadcast>(`${root(scope)}/occasions/${key}/draft`),
};
