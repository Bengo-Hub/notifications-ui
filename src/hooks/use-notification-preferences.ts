'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type NotificationPreference } from '@/lib/api/settings';

const STALE_MS = 60 * 1000;

export const notificationPreferenceKeys = {
  list: () => ['notification-preferences'] as const,
};

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationPreferenceKeys.list(),
    queryFn: () => settingsApi.listNotificationPreferences(),
    staleTime: STALE_MS,
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { key: string; enabled?: boolean; channels?: string[] }) =>
      settingsApi.updateNotificationPreference(body),
    // Optimistic toggle so the switch feels instant; rolled back on error.
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: notificationPreferenceKeys.list() });
      const previous = queryClient.getQueryData<{ data: NotificationPreference[]; total: number }>(
        notificationPreferenceKeys.list()
      );
      if (previous) {
        queryClient.setQueryData(notificationPreferenceKeys.list(), {
          ...previous,
          data: previous.data.map((p) => {
            if (p.key !== body.key) return p;
            const next = { ...p };
            if (body.enabled !== undefined) {
              next.enabled = body.enabled;
              next.overridden = true;
            }
            if (body.channels !== undefined) {
              next.enabledChannels = body.channels as NotificationPreference['enabledChannels'];
              next.channelsOverridden = true;
            }
            return next;
          }),
        });
      }
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(notificationPreferenceKeys.list(), ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationPreferenceKeys.list() });
    },
  });
}

export function useResetNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => settingsApi.resetNotificationPreference(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationPreferenceKeys.list() });
    },
  });
}
