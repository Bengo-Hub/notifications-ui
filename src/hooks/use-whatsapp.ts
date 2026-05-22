'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappApi, type PlansResponse, type SubscriptionResponse, type SubscribeResult } from '@/lib/api/whatsapp';

const STALE_MS = 60 * 1000;

export const whatsappKeys = {
    plans: () => ['whatsapp', 'plans'] as const,
    subscription: () => ['whatsapp', 'subscription'] as const,
};

export function useWhatsAppPlans() {
    return useQuery<PlansResponse>({
        queryKey: whatsappKeys.plans(),
        queryFn: () => whatsappApi.listPlans(),
        staleTime: STALE_MS * 10,
    });
}

export function useWhatsAppSubscription() {
    return useQuery<SubscriptionResponse>({
        queryKey: whatsappKeys.subscription(),
        queryFn: () => whatsappApi.getSubscription(),
        staleTime: STALE_MS,
    });
}

export function useSubscribeWhatsApp() {
    const queryClient = useQueryClient();
    return useMutation<SubscribeResult, Error, { plan_id: string; return_url?: string }>({
        mutationFn: (data) => whatsappApi.subscribe(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: whatsappKeys.subscription() });
        },
    });
}

export function useCancelWhatsApp() {
    const queryClient = useQueryClient();
    return useMutation<{ message: string }, Error, void>({
        mutationFn: () => whatsappApi.cancel(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: whatsappKeys.subscription() });
        },
    });
}
