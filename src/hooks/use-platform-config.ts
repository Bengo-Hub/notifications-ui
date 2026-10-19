'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformConfigApi } from '@/lib/api/platform-config';

const STALE_MS = 60 * 1000;

export const platformConfigKeys = {
    settings: () => ['platform-config', 'settings'] as const,
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
