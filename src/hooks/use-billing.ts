'use client';

import { billingApi, type CreditBalance, type TransactionsResponse } from '@/lib/api/billing';
import { useQuery } from '@tanstack/react-query';

const STALE_MS = 60 * 1000; // 1 minute

export const billingKeys = {
    balance: (type: string) => ['billing', 'balance', type] as const,
    transactions: (params?: { type?: string; limit?: number; offset?: number }) =>
        ['billing', 'transactions', params] as const,
};

export function useCreditBalance(type: 'SMS' | 'WHATSAPP') {
    return useQuery<CreditBalance>({
        queryKey: billingKeys.balance(type),
        queryFn: () => billingApi.getBalance(type),
        staleTime: STALE_MS,
    });
}

export function useCreditTransactions(params?: { type?: string; limit?: number; offset?: number }) {
    return useQuery<TransactionsResponse>({
        queryKey: billingKeys.transactions(params),
        queryFn: () => billingApi.getTransactions(params),
        staleTime: STALE_MS,
    });
}
