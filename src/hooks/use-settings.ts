'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type ProviderSetting, type TenantBranding } from '@/lib/api/settings';

const STALE_MS = 5 * 60 * 1000;

export const settingsKeys = {
  platformProviders: () => ['settings', 'platform', 'providers'] as const,
  tenantProviders: (orgSlug: string) => ['settings', orgSlug, 'providers'] as const,
  branding: (orgSlug: string) => ['settings', orgSlug, 'branding'] as const,
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

export function useTenantProviders(orgSlug: string) {
  return useQuery({
    queryKey: settingsKeys.tenantProviders(orgSlug),
    queryFn: async () => {
      const res = await settingsApi.listProviders(orgSlug);
      const list = (res as { providers?: ProviderSetting[] })?.providers ?? (Array.isArray(res) ? res : []);
      return Array.isArray(list) ? list : [];
    },
    enabled: !!orgSlug,
    staleTime: STALE_MS,
  });
}

export function useBranding(orgSlug: string) {
  return useQuery({
    queryKey: settingsKeys.branding(orgSlug),
    queryFn: () => settingsApi.getBranding(orgSlug),
    enabled: !!orgSlug,
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
