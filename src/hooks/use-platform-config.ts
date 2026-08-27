'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformConfigApi, type UpsertBackupDestination, type PlatformBillingSettings } from '@/lib/api/platform-config';

const STALE_MS = 60 * 1000;

export const platformConfigKeys = {
    settings: () => ['platform-config', 'settings'] as const,
    platformBackupDestination: () => ['platform-config', 'backup-destination', 'platform'] as const,
    tenantBackupDestination: () => ['platform-config', 'backup-destination', 'tenant'] as const,
    billing: () => ['platform-config', 'billing'] as const,
};

export function usePlatformSettings() {
    return useQuery({
        queryKey: platformConfigKeys.settings(),
        queryFn: async () => (await platformConfigApi.listPlatformSettings()).data,
        staleTime: STALE_MS,
    });
}

export function useUpsertPlatformSetting() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ key, body }: { key: string; body: { config_value: string; description?: string } }) =>
            platformConfigApi.upsertPlatformSetting(key, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: platformConfigKeys.settings() }),
    });
}

export function usePlatformBackupDestination() {
    return useQuery({
        queryKey: platformConfigKeys.platformBackupDestination(),
        queryFn: () => platformConfigApi.getPlatformBackupDestination(),
        staleTime: STALE_MS,
    });
}

export function useUpdatePlatformBackupDestination() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: UpsertBackupDestination) => platformConfigApi.putPlatformBackupDestination(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: platformConfigKeys.platformBackupDestination() }),
    });
}

export function useTestPlatformBackupDestination() {
    return useMutation({
        mutationFn: (body: UpsertBackupDestination) => platformConfigApi.testPlatformBackupDestination(body),
    });
}

export function useTenantBackupDestination() {
    return useQuery({
        queryKey: platformConfigKeys.tenantBackupDestination(),
        queryFn: () => platformConfigApi.getTenantBackupDestination(),
        staleTime: STALE_MS,
    });
}

export function useUpdateTenantBackupDestination() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: UpsertBackupDestination) => platformConfigApi.putTenantBackupDestination(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: platformConfigKeys.tenantBackupDestination() }),
    });
}

export function useTestTenantBackupDestination() {
    return useMutation({
        mutationFn: (body: UpsertBackupDestination) => platformConfigApi.testTenantBackupDestination(body),
    });
}

export function usePlatformBilling() {
    return useQuery({
        queryKey: platformConfigKeys.billing(),
        queryFn: () => platformConfigApi.getPlatformBilling(),
        staleTime: STALE_MS,
    });
}

export function useUpdatePlatformBilling() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: PlatformBillingSettings) => platformConfigApi.updatePlatformBilling(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: platformConfigKeys.billing() }),
    });
}

export function useBillingMargin() {
    return useQuery({
        queryKey: ['platform-config', 'margin'] as const,
        queryFn: () => platformConfigApi.getMargin(),
        staleTime: STALE_MS,
    });
}
