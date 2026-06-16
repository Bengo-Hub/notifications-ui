'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backupsApi, type BackupSettings } from '@/lib/api/backups';

const STALE_MS = 5 * 60 * 1000;

export const backupKeys = {
  settings: () => ['backups', 'settings'] as const,
};

export function useBackupSettings() {
  return useQuery({
    queryKey: backupKeys.settings(),
    queryFn: () => backupsApi.getSettings(),
    staleTime: STALE_MS,
  });
}

export function useUpdateBackupSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BackupSettings) => backupsApi.updateSettings(body),
    onSuccess: (data) => {
      queryClient.setQueryData(backupKeys.settings(), data);
      queryClient.invalidateQueries({ queryKey: backupKeys.settings() });
    },
  });
}
