'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type NotificationPreference, type PreferenceScope } from '@/lib/api/settings';

const STALE_MS = 60 * 1000;

export const notificationPreferenceKeys = {
  all: ['notification-preferences'] as const,
  list: (scope: PreferenceScope = 'tenant') => ['notification-preferences', scope] as const,
};

export function useNotificationPreferences(scope: PreferenceScope = 'tenant') {
  return useQuery({
    queryKey: notificationPreferenceKeys.list(scope),
    queryFn: () => settingsApi.listNotificationPreferences(scope),
    staleTime: STALE_MS,
  });
}

export function useUpdateNotificationPreference(scope: PreferenceScope = 'tenant') {
  const queryClient = useQueryClient();
  const key = notificationPreferenceKeys.list(scope);
  return useMutation({
    mutationFn: (body: { key: string; enabled?: boolean; channels?: string[] }) =>
      settingsApi.updateNotificationPreference(body, scope),
    // Optimistic toggle so the switch feels instant; rolled back on error.
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ data: NotificationPreference[]; total: number }>(key);
      if (previous) {
        queryClient.setQueryData(key, {
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
        queryClient.setQueryData(key, ctx.previous);
      }
    },
    // A platform default changes what every tenant view inherits, so both lists refresh.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationPreferenceKeys.all });
    },
  });
}

export function useResetNotificationPreference(scope: PreferenceScope = 'tenant') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => settingsApi.resetNotificationPreference(key, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationPreferenceKeys.all });
    },
  });
}
