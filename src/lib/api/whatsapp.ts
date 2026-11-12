import { apiClient } from './client';

// WhatsApp plans, bundles and balances live in subscriptions-api (see credits.ts). This file only
// keeps the Meta template sync, which is a notifications concern.

export interface TemplateSyncResult {
    name: string;
    category: string;
    /** queued = still to submit, left for the next batch. */
    outcome: 'created' | 'skipped' | 'failed' | 'queued';
    detail?: string;
    dry_run?: boolean;
    /** Meta's review status for a template that already exists (APPROVED, PENDING, REJECTED...). */
    meta_status?: string;
    /** Meta's rejected_reason for a REJECTED template. */
    meta_reason?: string;
}

export interface TemplateSyncResponse {
    waba_id: string;
    results: TemplateSyncResult[];
    summary: Record<string, number>;
    /** Templates still to submit after this batch; call again until it is 0. */
    remaining?: number;
}

/** One template this tenant uses, with its review status on the tenant's own WhatsApp Business Account. */
export interface TenantTemplateStatus {
    name: string;
    category: string;
    /** APPROVED, PENDING, REJECTED, PAUSED, DISABLED, or MISSING when not yet submitted. */
    status: string;
    /** Meta's reason for a REJECTED template. */
    reason?: string;
}

export interface TenantTemplateStatusResponse {
    waba_id: string;
    /** Services the selection matched (ordering, pos, ...); shared templates are always included. */
    services: string[];
    templates: TenantTemplateStatus[];
    summary: Record<string, number>;
}

export interface TenantTemplateSyncResponse {
    waba_id: string;
    services: string[];
    results: TemplateSyncResult[];
    summary: Record<string, number>;
    /** Templates still to submit after this batch; call again until it is 0. */
    remaining: number;
}

// One tenant sync call submits up to 10 templates to Meta with a pause between them; Meta can be slow.
const TENANT_SYNC_TIMEOUT_MS = 120000;

/** The business profile of the tenant's own WhatsApp number, as Meta has it. */
export interface WhatsAppBusinessProfile {
    phone_number_id: string;
    display_phone_number?: string;
    /** The name Meta reviewed for the number (verified_name). */
    display_name?: string;
    /** APPROVED, AVAILABLE_WITHOUT_REVIEW, PENDING_REVIEW, DECLINED, EXPIRED or NONE. */
    name_status?: string;
    /** A requested name change and its review state. */
    new_display_name?: string;
    new_name_status?: string;
    /** GREEN, YELLOW, RED, or NA/UNKNOWN when there is too little traffic to rate. */
    quality_rating?: string;
    about: string;
    address: string;
    description: string;
    email: string;
    websites: string[];
    vertical: string;
    photo_url?: string;
}

export interface WhatsAppProfileUpdate {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    websites?: string[];
    vertical?: string;
}

export interface WhatsAppBrandingSyncResult {
    /** Fields filled from the business's branding: about, description, address, email, websites, photo. */
    filled: string[];
    warnings?: string[];
    profile?: WhatsAppBusinessProfile;
}

// Profile calls reach Meta (a photo is three calls), so they get a longer timeout than the default.
const PROFILE_TIMEOUT_MS = 90_000;

export const whatsappProfileApi = {
    get: () => apiClient.get<WhatsAppBusinessProfile>('/api/v1/settings/whatsapp/profile'),
    update: (body: WhatsAppProfileUpdate) =>
        apiClient.put<WhatsAppBusinessProfile>('/api/v1/settings/whatsapp/profile', body, { timeout: PROFILE_TIMEOUT_MS }),
    uploadPhoto: (file: File) => {
        const form = new FormData();
        form.append('file', file);
        return apiClient.post<WhatsAppBusinessProfile>('/api/v1/settings/whatsapp/profile/photo', form, {
            // The client defaults to JSON, which would turn the form into JSON; the browser adds the boundary.
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: PROFILE_TIMEOUT_MS,
        });
    },
    photoFromUrl: (url: string) =>
        apiClient.post<WhatsAppBusinessProfile>('/api/v1/settings/whatsapp/profile/photo', { url }, { timeout: PROFILE_TIMEOUT_MS }),
    syncBranding: () =>
        apiClient.post<WhatsAppBrandingSyncResult>('/api/v1/settings/whatsapp/profile/sync-branding', undefined, { timeout: PROFILE_TIMEOUT_MS }),
};

/** What Disconnect undid on Meta; the saved connection is always removed. */
export interface WhatsAppDisconnectResult {
    message: string;
    deregistered: boolean;
    unsubscribed: boolean;
    notes?: string[];
}

export const whatsappApi = {
    // Releases the number on Meta (when the account still exists) and removes the saved connection.
    disconnect: () =>
        apiClient.delete<WhatsAppDisconnectResult>('/api/v1/billing/whatsapp/connection', { timeout: TENANT_SYNC_TIMEOUT_MS }),
    // The templates this tenant uses, with their status on the tenant's own WABA.
    tenantTemplates: () => apiClient.get<TenantTemplateStatusResponse>('/api/v1/settings/whatsapp/templates'),
    // Submits the missing ones to the tenant's own WABA, one batch per call; repeat while remaining > 0.
    syncTenantTemplates: (dryRun = false) =>
        apiClient.post<TenantTemplateSyncResponse>('/api/v1/settings/whatsapp/templates/sync', { dry_run: dryRun }, { timeout: TENANT_SYNC_TIMEOUT_MS }),

    // syncTemplates idempotently syncs the drafted WhatsApp template set to Meta. dryRun (the
    // default everywhere this is called from the UI) previews with zero write calls to Meta.
    // A real submit goes in small batches (batchSize, at most 10 per call): call again while
    // remaining > 0. Meta is slow, so these calls get a longer timeout than the client default.
    syncTemplates: (opts: { dryRun: boolean; only?: string[]; names?: string[]; batchSize?: number }) =>
        apiClient.post<TemplateSyncResponse>('/api/v1/platform/whatsapp/templates/sync', {
            dry_run: opts.dryRun,
            only: opts.only,
            names: opts.names,
            batch_size: opts.batchSize,
        }, { timeout: 90000 }),
};
