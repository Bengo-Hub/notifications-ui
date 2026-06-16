import { apiClient } from './client';

export interface BackupSettings {
    auto_enabled: boolean;
    schedule_hour: number;
    retention_days: number;
}

export const backupsApi = {
    getSettings: () =>
        apiClient.get<BackupSettings>('/api/v1/backups/settings'),

    updateSettings: (body: BackupSettings) =>
        apiClient.put<BackupSettings>('/api/v1/backups/settings', body),
};
