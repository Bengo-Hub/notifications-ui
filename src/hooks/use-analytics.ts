'use client';

import { analyticsApi, type ActivityLog, type ActivityLogFilters } from '@/lib/api/analytics';
import { useQuery } from '@tanstack/react-query';

const STALE_MS = 2 * 60 * 1000;

export const analyticsKeys = {
  deliveryStats: (range?: string) => ['analytics', 'delivery', 'current', range ?? '24h'] as const,
  activityLogs: (limit?: number, filters?: ActivityLogFilters) =>
    ['analytics', 'logs', 'current', limit ?? 20, filters] as const,
};

export function useDeliveryStats(range = '24h') {
  return useQuery({
    queryKey: analyticsKeys.deliveryStats(range),
    queryFn: () => analyticsApi.getDeliveryStats(range),
    staleTime: STALE_MS,
  });
}

export function useActivityLogs(limit = 20, filters?: ActivityLogFilters) {
  return useQuery({
    queryKey: analyticsKeys.activityLogs(limit, filters),
    queryFn: async () => {
      const res = await analyticsApi.getActivityLogs(limit, filters);
      return (Array.isArray(res) ? res : (res as { logs?: ActivityLog[] })?.logs ?? []) as ActivityLog[];
    },
    staleTime: STALE_MS,
  });
}
