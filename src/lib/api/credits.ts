import { subscriptionsClient } from './client';

export type CreditService = 'sms' | 'whatsapp';

export interface CreditBundle {
    code: string;
    units: number;
    price_kes: number;
}

export interface CreditTier {
    code: string;
    name: string;
    price_kes: number;
    /** -1 means unlimited. */
    monthly_units: number;
}

export interface CreditSnapshot {
    service: string;
    label: string;
    exempt: boolean;
    covered: boolean;
    reason?: string;
    bundle_balance: number;
    quota_balance: number;
    unlimited: boolean;
    tier_code?: string;
    tier_period_end?: string;
    auto_renew: boolean;
    overage_pending_kes: number;
    overage_cap_kes: number;
    unit_price_kes: number;
    bundles: CreditBundle[];
    tiers: CreditTier[] | null;
}

export interface CreditLedgerEntry {
    id: string;
    action: 'grant' | 'topup' | 'deduction' | 'refund' | 'adjustment' | 'overage';
    tokens: number;
    new_balance: number;
    description?: string;
    created_at: string;
}

export interface CreditLedgerResponse {
    data: CreditLedgerEntry[];
    total: number;
    limit: number;
    offset: number;
}

export interface PurchaseIntent {
    intent_id: string;
    status: string;
    amount: string;
    currency: string;
    initiate_url?: string;
    authorization_url?: string;
}

export const creditsApi = {
    list: () => subscriptionsClient.get<{ services: CreditSnapshot[] }>('/api/v1/credits'),

    transactions: (service: CreditService, params?: { limit?: number; offset?: number }) => {
        const q = new URLSearchParams();
        if (params?.limit != null) q.set('limit', String(params.limit));
        if (params?.offset != null) q.set('offset', String(params.offset));
        return subscriptionsClient.get<CreditLedgerResponse>(`/api/v1/credits/${service}/transactions?${q.toString()}`);
    },

    purchase: (service: CreditService, body: { kind: 'bundle' | 'tier'; code: string; return_url?: string }) =>
        subscriptionsClient.post<PurchaseIntent>(`/api/v1/credits/${service}/purchase`, body),

    setAutoRenew: (service: CreditService, autoRenew: boolean) =>
        subscriptionsClient.post<{ auto_renew: boolean }>(`/api/v1/credits/${service}/auto-renew`, { auto_renew: autoRenew }),
};
