'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type ProviderSetting, type TenantBranding } from '@/lib/api/settings';

const STALE_MS = 5 * 60 * 1000;

export const settingsKeys = {
  platformProviders: () => ['settings', 'platform', 'providers'] as const,
  tenantProviders: () => ['settings', 'current', 'providers'] as const,
  branding: () => ['settings', 'current', 'branding'] as const,
};

export function usePlatformProviders() {
  return useQuery({
    queryKey: settingsKeys.platformProviders(),
    queryFn: async () => {
      const res = await settingsApi.listPlatformProviders();
      return res?.providers ?? [];
    },
    staleTime: STALE_MS,
  });
}

export function useTenantProviders() {
  return useQuery({
    queryKey: settingsKeys.tenantProviders(),
    queryFn: async () => {
      const res = await settingsApi.listProviders();
      const list = (res as { providers?: ProviderSetting[] })?.providers ?? (Array.isArray(res) ? res : []);
      return Array.isArray(list) ? list : [];
    },
    staleTime: STALE_MS,
  });
}

export function useBranding() {
  return useQuery({
    queryKey: settingsKeys.branding(),
    queryFn: () => settingsApi.getBranding(),
    staleTime: STALE_MS,
  });
}

export function useTestPlatformProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) =>
      settingsApi.testPlatformProvider(id, { to }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.platformProviders() });
    },
  });
}
