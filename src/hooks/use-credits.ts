'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creditsApi, type AutoTopup, type AutoTopupInput, type CreditLedgerResponse, type CreditService, type CreditSnapshot } from '@/lib/api/credits';

const STALE_MS = 30 * 1000;

export const creditKeys = {
    all: ['credits'] as const,
    list: () => ['credits', 'list'] as const,
    transactions: (service: CreditService, limit?: number) => ['credits', 'transactions', service, limit] as const,
};

/** SMS and WhatsApp state for the acting tenant, from subscriptions-api. */
export function useCredits() {
    return useQuery<CreditSnapshot[]>({
        queryKey: creditKeys.list(),
        queryFn: async () => (await creditsApi.list()).services,
        staleTime: STALE_MS,
    });
}

export function useCreditSnapshot(service: CreditService) {
    const query = useCredits();
    return { ...query, data: query.data?.find((s) => s.service === service) };
}

export function useCreditTransactions(service: CreditService, limit = 10) {
    return useQuery<CreditLedgerResponse>({
        queryKey: creditKeys.transactions(service, limit),
        queryFn: () => creditsApi.transactions(service, { limit }),
        staleTime: STALE_MS,
    });
}

export function useSetAutoTopup(service: CreditService) {
    const queryClient = useQueryClient();
    return useMutation<AutoTopup, Error, AutoTopupInput>({
        mutationFn: (body) => creditsApi.setAutoTopup(service, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: creditKeys.all }),
    });
}

export function useSetAutoRenew(service: CreditService) {
    const queryClient = useQueryClient();
    return useMutation<{ auto_renew: boolean }, Error, boolean>({
        mutationFn: (on) => creditsApi.setAutoRenew(service, on),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: creditKeys.all }),
    });
}
