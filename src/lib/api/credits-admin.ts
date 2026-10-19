import { subscriptionsClient } from './client';

/** Credit services a platform owner can inspect. */
export type AdminCreditService = 'sms' | 'whatsapp' | 'ai_credits';

export type AdminTenantStatus = 'active' | 'capped' | 'not_activated' | 'exempt';

export interface AdminTenantRow {
    tenant_id: string;
    slug: string;
    name: string;
    exempt: boolean;
    plan_name?: string;
    plan_status?: string;
    status: AdminTenantStatus;
    activated: boolean;
    bundle_balance: number;
    quota_balance: number;
    unlimited: boolean;
    tier_code?: string;
    tier_name?: string;
    tier_active: boolean;
    tier_period_end?: string;
    auto_renew: boolean;
    overage_pending_kes: number;
    overage_cap_kes: number;
    capped: boolean;
    units_used_month: number;
    last_activity_at?: string;
}

export interface AdminTenantPage {
    service: AdminCreditService;
    data: AdminTenantRow[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminServiceOverview {
    service: AdminCreditService;
    label: string;
    allows_overage: boolean;
    tenants_activated: number;
    units_sold_month: number;
    units_consumed_month: number;
    bundle_revenue_month_kes: number;
    overage_accrued_month_kes: number;
    overage_outstanding_kes: number;
    tenants_at_cap: number;
}

export interface AdminOverview {
    month_start: string;
    overage_cap_kes: number;
    services: AdminServiceOverview[];
}

export interface AdminMessagingSettings {
    overage_cap_kes: number;
    default_overage_cap_kes: number;
    max_overage_cap_kes: number;
    updated_at?: string;
}

export interface AdminTenantQuery {
    service: AdminCreditService;
    q?: string;
    status?: AdminTenantStatus | '';
    limit: number;
    offset: number;
}

export const creditsAdminApi = {
    tenants: (p: AdminTenantQuery) =>
        subscriptionsClient.get<AdminTenantPage>('/api/v1/admin/credits/tenants', {
            service: p.service,
            q: p.q || undefined,
            status: p.status || undefined,
            limit: p.limit,
            offset: p.offset,
        }),

    overview: () => subscriptionsClient.get<AdminOverview>('/api/v1/admin/credits/overview'),

    settings: () => subscriptionsClient.get<AdminMessagingSettings>('/api/v1/admin/credits/settings'),

    saveSettings: (body: { overage_cap_kes: number }) =>
        subscriptionsClient.put<AdminMessagingSettings>('/api/v1/admin/credits/settings', body),

    /** Adds units without a payment. key makes a retried request apply once. */
    grant: (tenantId: string, service: AdminCreditService, body: { units: number; reason: string; key: string }) =>
        subscriptionsClient.post<{ balance: number; applied: boolean }>(
            `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/credits/${service}/grant`,
            body,
        ),
};

/** The server's error text, or a fallback, from an axios failure. */
export function apiErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { error?: string } } })?.response?.data;
    return data?.error || fallback;
}
