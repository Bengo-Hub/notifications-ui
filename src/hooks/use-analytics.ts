'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type DeliveryStats, type ActivityLog } from '@/lib/api/analytics';

const STALE_MS = 2 * 60 * 1000;

export const analyticsKeys = {
  deliveryStats: (orgSlug: string, range?: string) => ['analytics', 'delivery', orgSlug, range ?? '24h'] as const,
  activityLogs: (orgSlug: string, limit?: number) => ['analytics', 'logs', orgSlug, limit ?? 20] as const,
};

export function useDeliveryStats(orgSlug: string, range = '24h') {
  return useQuery({
    queryKey: analyticsKeys.deliveryStats(orgSlug, range),
    queryFn: () => analyticsApi.getDeliveryStats(orgSlug, range),
    enabled: !!orgSlug,
    staleTime: STALE_MS,
  });
}

export function useActivityLogs(orgSlug: string, limit = 20) {
  return useQuery({
    queryKey: analyticsKeys.activityLogs(orgSlug, limit),
    queryFn: async () => {
      const res = await analyticsApi.getActivityLogs(orgSlug, limit);
      return (Array.isArray(res) ? res : (res as { logs?: ActivityLog[] })?.logs ?? []) as ActivityLog[];
    },
    enabled: !!orgSlug,
    staleTime: STALE_MS,
  });
}
