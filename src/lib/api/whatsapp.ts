import { apiClient } from './client';

export interface WhatsAppPlan {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    messages_per_month: number;
    is_active: boolean;
}

export interface WhatsAppSubscription {
    id: string;
    tenant_id: string;
    plan: WhatsAppPlan;
    status: 'active' | 'cancelled' | 'expired' | 'trial';
    started_at: string;
    expires_at: string;
    auto_renew: boolean;
    messages_used: number;
    payment_reference?: string;
}

export interface PlansResponse {
    data: WhatsAppPlan[];
}

export interface SubscriptionResponse {
    subscription: WhatsAppSubscription | null;
    status?: string;
}

export interface SubscribeResult {
    intent_id: string;
    status: string;
    amount: string;
    currency: string;
    initiate_url?: string;
    authorization_url?: string;
}

export interface WhatsAppSubscriptionAdminRow {
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    plan: WhatsAppPlan;
    status: 'active' | 'cancelled' | 'expired' | 'trial';
    started_at: string;
    expires_at: string;
    auto_renew: boolean;
    messages_used: number;
    payment_reference?: string;
}

export interface RecordPaymentResult {
    message: string;
    result: SubscribeResult;
}

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

export const whatsappApi = {
    listPlans: () =>
        apiClient.get<PlansResponse>('/api/v1/billing/whatsapp/plans'),

    getSubscription: () =>
        apiClient.get<SubscriptionResponse>('/api/v1/billing/whatsapp/subscription'),

    subscribe: (data: { plan_id: string; return_url?: string }) =>
        apiClient.post<SubscribeResult>('/api/v1/billing/whatsapp/subscribe', data),

    cancel: () =>
        apiClient.post<{ message: string }>('/api/v1/billing/whatsapp/cancel', {}),

    // Platform-admin only — cross-tenant subscription management table.
    listAllSubscriptions: () =>
        apiClient.get<{ data: WhatsAppSubscriptionAdminRow[]; total: number }>('/api/v1/platform/billing/whatsapp/subscriptions'),

    // Reconciles a payment received outside the normal checkout flow (bank transfer, cash, till)
    // for the given tenant — creates the payment intent and immediately confirms it as paid.
    recordPayment: (tenantId: string, data: { plan_id: string; reference?: string }) =>
        apiClient.post<RecordPaymentResult>(`/api/v1/platform/billing/whatsapp/subscriptions/${tenantId}/record-payment`, data),

    // syncTemplates idempotently syncs the drafted WhatsApp template set to Meta — dryRun (the
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
