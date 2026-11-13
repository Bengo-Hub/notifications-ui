import { apiClient } from './client';

/** Report categories. Meta's categories fold into the first five; legacy_allowance is the retired tiers' shared credits. */
export type CostCategory = 'marketing' | 'utility' | 'authentication' | 'service' | 'other' | 'legacy_allowance';

export interface MetaUsage {
    messages: number;
    cost: number;
}

export interface TenantCredits {
    consumed: number;
    bought: number;
    kes_paid: number;
    overage_kes: number;
    consumed_value_kes: number;
}

export interface CostRow {
    waba_id?: string;
    phone_number_id?: string;
    display_phone_number?: string;
    verified_name?: string;
    tenant_id?: string;
    /** Slug, "platform" or "unassigned". */
    tenant: string;
    note?: string;
    meta_currency?: string;
    meta: Partial<Record<CostCategory, MetaUsage>>;
    meta_messages: number;
    meta_cost: number;
    credits: Partial<Record<CostCategory, TenantCredits>>;
    credits_consumed: number;
    kes_paid: number;
    consumed_value_kes: number;
    /** The WABA's total when Meta did not split its charges by number. */
    whole_account?: boolean;
    /** Meta's cost at treasury's rate, and credits value less it. Unset when no rate was available. */
    meta_cost_kes?: number;
    margin_kes?: number;
}

export interface CostWaba {
    waba_id: string;
    owner: string;
    token_source: 'own' | 'platform' | '';
    currency?: string;
    kes_per_unit?: number;
    rate_unavailable?: boolean;
    error?: string;
    rows: CostRow[];
}

export interface CostTotals {
    meta_messages: number;
    meta_cost: Record<string, number>;
    meta_cost_kes?: number;
    rate_unavailable?: boolean;
    credits_consumed: number;
    kes_paid: number;
    consumed_value_kes: number;
    margin_kes?: number;
}

export interface WhatsAppCostReport {
    from: string;
    to: string;
    generated_at: string;
    cached: boolean;
    categories: CostCategory[];
    wabas: CostWaba[];
    tenants_on_platform_number: CostRow[];
    totals: CostTotals;
    credits_error?: string;
    notes: string[];
}

export const whatsappCostsApi = {
    get: (from: string, to: string) =>
        apiClient.get<WhatsAppCostReport>('/api/v1/platform/whatsapp/costs', { from, to }),
};
