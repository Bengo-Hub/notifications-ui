import { apiClient } from './client';

export interface ServiceConfigItem {
    id: string;
    tenant_id?: string | null;
    config_key: string;
    config_value: string;
    config_type: string;
    description?: string;
    is_secret: boolean;
    is_override: boolean;
    created_at: string;
    updated_at: string;
}

export const platformConfigApi = {
    listPlatformSettings: () =>
        apiClient.get<{ data: ServiceConfigItem[]; total: number }>('/api/v1/platform/config'),

    upsertPlatformSetting: (key: string, body: { config_value: string; description?: string }) =>
        apiClient.put<ServiceConfigItem>(`/api/v1/platform/config/${encodeURIComponent(key)}`, body),
};
