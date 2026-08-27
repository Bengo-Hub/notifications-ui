import { apiClient } from './client';

export interface CreditBalance {
    tenant_id: string;
    type: string;
    balance: number;
}

export interface CreditTransaction {
    id: string;
    tenant_id: string;
    type: string;
    action: 'TOPUP' | 'DEDUCTION' | 'REFUND' | 'ADJUSTMENT';
    amount: number;
    new_balance: number;
    reference_id: string;
    description: string;
    created_at: string;
}

export interface TransactionsResponse {
    data: CreditTransaction[];
    total: number;
    limit: number;
    offset: number;
}

export interface TopUpResult {
    intent_id: string;
    status: string;
    amount: string;
    currency: string;
    initiate_url?: string;
    authorization_url?: string;
}

export const billingApi = {
    // Credits are an SMS-only wallet — WhatsApp is billed via subscription plans (see use-whatsapp.ts).
    getBalance: (type: 'SMS') =>
        apiClient.get<CreditBalance>(`/api/v1/billing/balance?type=${type}`),

    getTransactions: (params?: { type?: string; limit?: number; offset?: number }) => {
        const q = new URLSearchParams();
        if (params?.type) q.set('type', params.type);
        if (params?.limit != null) q.set('limit', String(params.limit));
        if (params?.offset != null) q.set('offset', String(params.offset));
        return apiClient.get<TransactionsResponse>(`/api/v1/billing/transactions?${q.toString()}`);
    },

    initiateTopUp: (data: { credit_type: string; amount: number; return_url?: string }) =>
        apiClient.post<TopUpResult>('/api/v1/billing/initiate', data),

    topUp: (data: { tenant_id: string; type: string; amount: number; reference_id: string }) =>
        apiClient.post('/api/v1/billing/topup', data),
};
