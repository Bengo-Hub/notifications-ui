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

export const whatsappApi = {
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
