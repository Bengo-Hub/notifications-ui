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
      // Fetch both available providers and tenant's selected providers
      const [availRes, selectedRes] = await Promise.all([
        settingsApi.listProviders(),
        settingsApi.getSelectedProviders(),
      ]);
      const available = (availRes as { providers?: ProviderSetting[] })?.providers ?? [];
      const selected = (selectedRes as { selected?: { provider_type: string; provider_name: string }[] })?.selected ?? [];

      // Build a map of selected providers by channel
      const selectedMap = new Map<string, string>();
      for (const s of selected) {
        selectedMap.set(s.provider_type, s.provider_name);
      }

      // For each channel that has a selection, return that provider
      // For channels without a selection, return the first active available provider
      const result: ProviderSetting[] = [];
      const seen = new Set<string>();
      for (const sel of selected) {
        const match = available.find(
          (a: any) => a.provider_type === sel.provider_type && a.provider_name === sel.provider_name
        );
        result.push({
          ...(match ?? {}),
          provider_type: sel.provider_type,
          provider_name: sel.provider_name,
          is_active: true,
          status: 'active',
        } as ProviderSetting);
        seen.add(sel.provider_type);
      }
      // Add first active provider for channels not yet selected
      for (const a of available) {
        const pType = (a as any).provider_type;
        if (!seen.has(pType) && (a as any).is_active) {
          result.push(a);
          seen.add(pType);
        }
      }
      return result;
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
