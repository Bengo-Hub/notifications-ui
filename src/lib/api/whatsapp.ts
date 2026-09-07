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

export interface TemplateSyncResult {
    name: string;
    category: string;
    outcome: 'created' | 'skipped' | 'failed';
    detail?: string;
    dry_run?: boolean;
}

export interface TemplateSyncResponse {
    waba_id: string;
    results: TemplateSyncResult[];
    summary: Record<string, number>;
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

    // syncTemplates idempotently syncs the drafted WhatsApp template set to Meta — dryRun (the
    // default everywhere this is called from the UI) previews with zero write calls to Meta.
    syncTemplates: (opts: { dryRun: boolean; only?: string[] }) =>
        apiClient.post<TemplateSyncResponse>('/api/v1/platform/whatsapp/templates/sync', {
            dry_run: opts.dryRun,
            only: opts.only,
        }),
};
