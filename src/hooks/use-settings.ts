'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type ProviderSetting } from '@/lib/api/settings';
import { whatsappApi } from '@/lib/api/whatsapp';

const STALE_MS = 5 * 60 * 1000;

export const settingsKeys = {
  platformTenants: () => ['settings', 'platform', 'tenants'] as const,
  platformProviders: () => ['settings', 'platform', 'providers'] as const,
  tenantProviders: () => ['settings', 'current', 'providers'] as const,
  tenantWhatsAppTemplates: () => ['settings', 'current', 'whatsapp-templates'] as const,
};

/** The templates this tenant uses and their status on its own WhatsApp Business Account. */
export function useTenantWhatsAppTemplates(enabled: boolean) {
  return useQuery({
    queryKey: settingsKeys.tenantWhatsAppTemplates(),
    queryFn: () => whatsappApi.tenantTemplates(),
    enabled,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export interface TemplateSyncProgress {
  created: number;
  failed: number;
  remaining: number;
}

/**
 * Submits the tenant's missing templates to its own WABA. The API takes one batch per call, so
 * this calls again while templates remain and a batch still makes progress, reporting as it goes.
 */
export function useSyncTenantWhatsAppTemplates(onProgress?: (p: TemplateSyncProgress) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<TemplateSyncProgress> => {
      let created = 0;
      const failed = new Set<string>();
      let remaining = 0;
      let last = -1;
      for (let i = 0; i < 20; i++) {
        const res = await whatsappApi.syncTenantTemplates(false);
        for (const r of res.results ?? []) {
          if (r.outcome === 'created') {
            created++;
            failed.delete(r.name);
          } else if (r.outcome === 'failed') {
            failed.add(r.name);
          }
        }
        remaining = res.remaining ?? 0;
        onProgress?.({ created, failed: failed.size, remaining });
        if (remaining === 0 || remaining === last) break;
        last = remaining;
      }
      return { created, failed: failed.size, remaining };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: settingsKeys.tenantWhatsAppTemplates() }),
  });
}

export function usePlatformTenants(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.platformTenants(),
    queryFn: () => settingsApi.listPlatformTenants(),
    staleTime: STALE_MS,
    enabled,
  });
}

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

export function useTestTenantProvider() {
  return useMutation({
    mutationFn: (body: { provider_type: string; provider_name: string; to?: string }) =>
      settingsApi.testProvider(body),
  });
}

export function useWebhookConfig() {
  return useQuery({
    queryKey: ['settings', 'current', 'webhooks'] as const,
    queryFn: () => settingsApi.getWebhookConfig(),
    staleTime: STALE_MS,
  });
}
