'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    creditsAdminApi,
    type AdminCreditService,
    type AdminMessagingSettings,
    type AdminOverview,
    type AdminTenantPage,
    type AdminTenantQuery,
} from '@/lib/api/credits-admin';

const STALE_MS = 30 * 1000;

export const creditsAdminKeys = {
    all: ['credits-admin'] as const,
    overview: () => ['credits-admin', 'overview'] as const,
    tenants: (q: AdminTenantQuery) => ['credits-admin', 'tenants', q] as const,
    settings: () => ['credits-admin', 'settings'] as const,
};

export function useCreditsOverview() {
    return useQuery<AdminOverview>({
        queryKey: creditsAdminKeys.overview(),
        queryFn: creditsAdminApi.overview,
        staleTime: STALE_MS,
    });
}

export function useCreditsTenants(query: AdminTenantQuery) {
    return useQuery<AdminTenantPage>({
        queryKey: creditsAdminKeys.tenants(query),
        queryFn: () => creditsAdminApi.tenants(query),
        staleTime: STALE_MS,
        placeholderData: keepPreviousData,
    });
}

export function useMessagingSettings() {
    return useQuery<AdminMessagingSettings>({
        queryKey: creditsAdminKeys.settings(),
        queryFn: creditsAdminApi.settings,
        staleTime: STALE_MS,
    });
}

export function useSaveMessagingSettings() {
    const qc = useQueryClient();
    return useMutation<AdminMessagingSettings, Error, { overage_cap_kes: number }>({
        mutationFn: creditsAdminApi.saveSettings,
        onSuccess: () => qc.invalidateQueries({ queryKey: creditsAdminKeys.all }),
    });
}

export function useGrantCredits() {
    const qc = useQueryClient();
    return useMutation<
        { balance: number; applied: boolean },
        Error,
        { tenantId: string; service: AdminCreditService; units: number; reason: string; key: string }
    >({
        mutationFn: ({ tenantId, service, ...body }) => creditsAdminApi.grant(tenantId, service, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: creditsAdminKeys.all }),
    });
}
