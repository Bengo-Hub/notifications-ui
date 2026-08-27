'use client';

import { analyticsApi, type ActivityLogFilters, type ActivityLogsPage } from '@/lib/api/analytics';
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

/** Real server pagination (limit/offset) — the backend now returns {logs, total} instead of a
 *  bare array, so the UI can show a genuine page count instead of guessing from a capped page. */
export function useActivityLogs(limit = 20, filters?: ActivityLogFilters) {
  return useQuery<ActivityLogsPage>({
    queryKey: analyticsKeys.activityLogs(limit, filters),
    queryFn: () => analyticsApi.getActivityLogs(limit, filters),
    staleTime: STALE_MS,
    placeholderData: (prev) => prev,
  });
}
