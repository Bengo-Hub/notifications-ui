import { apiClient } from './client';

export interface ProviderSetting {
    id: number | string;
    tenant_id?: string;
    channel?: 'email' | 'sms' | 'push';
    provider?: string;
    provider_type: string;
    provider_name: string;
    key?: string;
    value?: string;
    description?: string;
    is_encrypted?: boolean;
    is_platform?: boolean;
    is_active: boolean;
    status: 'active' | 'inactive' | 'error';
}

export interface TenantBranding {
    tenant_id: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
    custom_css?: string;
    metadata?: Record<string, any>;
}

/** Platform admin: list all platform-configured providers (no tenant filter). */
export const settingsApi = {
    listPlatformProviders: () =>
        apiClient.get<{ providers: ProviderSetting[] }>('/api/v1/platform/providers'),

    configurePlatformProvider: (body: { provider_type: string; provider_name: string; settings: Record<string, string> }) =>
        apiClient.post<{ message: string }>('/api/v1/platform/providers', body),

    updatePlatformProvider: (id: string, body: { settings?: Record<string, string>; is_active?: boolean }) =>
        apiClient.patch<{ message: string }>(`/api/v1/platform/providers/${id}`, body),

    testPlatformProvider: (id: string, body: { to: string }) =>
        apiClient.post<{ success: boolean; message?: string; error?: string }>(`/api/v1/platform/providers/${id}/test`, body),

    deactivatePlatformProvider: (id: string) =>
        apiClient.delete(`/api/v1/platform/providers/${id}`),

    listProviders: (orgSlug: string) =>
        apiClient.get<{ providers: unknown[] }>(`/api/v1/${orgSlug}/providers/available`),

    updateProvider: (orgSlug: string, setting: Partial<ProviderSetting>) =>
        apiClient.put(`/api/v1/${orgSlug}/providers/selected`, setting),

    getBranding: (orgSlug: string) =>
        apiClient.get<TenantBranding>(`/api/v1/${orgSlug}/branding`),

    updateBranding: (orgSlug: string, branding: Partial<TenantBranding>) =>
        apiClient.put(`/api/v1/${orgSlug}/branding`, branding),
};
