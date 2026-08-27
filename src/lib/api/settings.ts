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

export interface TenantListItem {
    id: string;
    name: string;
    slug: string;
}

/** Platform admin: list all platform-configured providers (no tenant filter). */
export const settingsApi = {
    listPlatformTenants: () =>
        apiClient.get<TenantListItem[]>('/api/v1/platform/tenants'),

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

    getPlatformProviderSettings: (providerType: string, providerName: string) =>
        apiClient.get<{ provider_type: string; provider_name: string; settings: Record<string, string> }>(
            `/api/v1/platform/providers/settings?provider_type=${providerType}&provider_name=${providerName}`
        ),

    listProviders: () =>
        apiClient.get<{ providers: unknown[] }>('/api/v1/providers/available'),

    getSelectedProviders: () =>
        apiClient.get<{ selected: { provider_type: string; provider_name: string }[] }>('/api/v1/providers/selected'),

    updateProvider: (setting: Partial<ProviderSetting>) =>
        apiClient.post('/api/v1/providers/select', setting),

    getProviderSettings: (providerType: string, providerName: string) =>
        apiClient.get<{ provider_type: string; provider_name: string; settings: Record<string, string> }>(
            `/api/v1/providers/settings?provider_type=${providerType}&provider_name=${providerName}`
        ),

    saveProviderSettings: (body: { provider_type: string; provider_name: string; settings: Record<string, string> }) =>
        apiClient.post<{ message: string }>('/api/v1/providers/settings', body),

    testProvider: (body: { provider_type: string; provider_name: string; to?: string }) =>
        apiClient.post<TestProviderResult>('/api/v1/providers/test', body),

    getWebhookConfig: () =>
        apiClient.get<WebhookConfig>('/api/v1/settings/webhooks'),

    getSecuritySettings: () =>
        apiClient.get<{ webhook_secret: string }>('/api/v1/settings/security'),

    getEncryptionKey: () =>
        apiClient.get<EncryptionKeyStatus>('/api/v1/platform/encryption-key'),

    updateEncryptionKey: (body: { generate?: boolean; key?: string }) =>
        apiClient.put<EncryptionKeyStatus>('/api/v1/platform/encryption-key', body),

    // Per-tenant notification-type toggles (feed the worker's dispatch gate).
    listNotificationPreferences: () =>
        apiClient.get<{ data: NotificationPreference[]; total: number }>('/api/v1/notification-preferences'),

    updateNotificationPreference: (body: { key: string; enabled: boolean }) =>
        apiClient.put<{ key: string; enabled: boolean }>('/api/v1/notification-preferences', body),
};

export interface NotificationPreference {
    key: string;
    label: string;
    group: string;
    /** locked = security-critical, always on; essential = default on; optional = default off */
    class: 'locked' | 'essential' | 'optional';
    default: boolean;
    enabled: boolean;
    overridden: boolean;
    channels: ('email' | 'sms' | 'whatsapp' | 'push')[];
}

export interface TestProviderResult {
    success: boolean;
    provider_type: string;
    provider_name: string;
    message?: string;
    error?: string;
    info?: Record<string, unknown> | null;
}

export interface WebhookConfig {
    whatsapp_callback_url: string;
    whatsapp_verify_token: string;
    africastalking_dlr_callback_url: string;
}

export interface EncryptionKeyStatus {
    configured: boolean;
    source: 'db' | 'env';
    key_fingerprint: string;
    updated_at: string | null;
}
