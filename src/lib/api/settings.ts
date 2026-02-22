import { apiClient } from './client';

export interface ProviderSetting {
    id: string;
    tenant_id: string;
    channel: 'email' | 'sms' | 'push';
    provider: string;
    provider_type: string;
    provider_name: string;
    key: string;
    value: string;
    description?: string;
    is_encrypted: boolean;
    is_platform: boolean;
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

export const settingsApi = {
    // Provider Settings
    listProviders: (orgSlug: string) =>
        apiClient.get<ProviderSetting[]>(`/settings/providers/${orgSlug}`),

    updateProvider: (orgSlug: string, setting: Partial<ProviderSetting>) =>
        apiClient.put(`/settings/providers/${orgSlug}`, setting),

    deleteProvider: (orgSlug: string, id: string) =>
        apiClient.delete(`/settings/providers/${orgSlug}/${id}`),

    // Branding Settings
    getBranding: (orgSlug: string) =>
        apiClient.get<TenantBranding>(`/settings/branding/${orgSlug}`),

    updateBranding: (orgSlug: string, branding: Partial<TenantBranding>) =>
        apiClient.put(`/settings/branding/${orgSlug}`, branding),
};
