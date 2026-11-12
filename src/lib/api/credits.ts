import { apiClient, subscriptionsClient } from './client';

/** WhatsApp is sold per message category; each category is its own credit service. */
export type WhatsAppCreditService =
    | 'whatsapp_marketing'
    | 'whatsapp_utility'
    | 'whatsapp_authentication'
    | 'whatsapp_service';

export type CreditService = 'sms' | WhatsAppCreditService;

/** Display order of the WhatsApp categories. */
export const WHATSAPP_CREDIT_SERVICES: WhatsAppCreditService[] = [
    'whatsapp_utility',
    'whatsapp_service',
    'whatsapp_marketing',
    'whatsapp_authentication',
];

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
    /** "whatsapp" for the WhatsApp categories. */
    group?: string;
    /** Plain category name, e.g. "Promotions and broadcasts". */
    name?: string;
    /** Meta's category word (MARKETING, UTILITY...); never shown without the plain name. */
    meta_category?: string;
    explainer?: string;
    tier_name?: string;
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
    auto_topup?: AutoTopup;
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

export interface AutoTopup {
    enabled: boolean;
    threshold: number;
    bundle_code: string;
    monthly_limit_kes: number;
    spent_month?: string;
    spent_kes: number;
    last_charge_at?: string;
    disabled_reason?: string;
}

export interface AutoTopupInput {
    enabled: boolean;
    threshold?: number;
    bundle_code?: string;
    monthly_limit_kes?: number;
}

export interface PurchaseIntent {
    intent_id: string;
    status: string;
    amount: string;
    currency: string;
    initiate_url?: string;
    authorization_url?: string;
}

export interface WhatsAppGuideMessage {
    template_id: string;
    label: string;
    sent: number;
}

/** One WhatsApp credit category with the tenant's own messages in it (notifications-api). */
export interface WhatsAppCategoryGuide {
    service: WhatsAppCreditService;
    meta_category: string;
    name: string;
    explainer: string;
    examples: string[];
    your_messages: WhatsAppGuideMessage[];
}

export const whatsappGuideApi = {
    get: () =>
        apiClient.get<{ categories: WhatsAppCategoryGuide[]; window_days: number }>(
            '/api/v1/settings/whatsapp/credit-categories',
        ),
};

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

    setAutoTopup: (service: CreditService, body: AutoTopupInput) =>
        subscriptionsClient.put<AutoTopup>(`/api/v1/credits/${service}/auto-topup`, body),
};
