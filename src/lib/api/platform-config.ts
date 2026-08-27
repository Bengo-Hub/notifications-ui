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

export interface DestinationParam {
    key: string;
    is_secret: boolean;
    set: boolean;
    value?: string;
}

export interface BackupDestination {
    configured: boolean;
    type: string;
    enabled: boolean;
    remote_path: string;
    params: DestinationParam[];
}

export interface UpsertBackupDestination {
    type: string;
    enabled: boolean;
    remote_path: string;
    params: Record<string, string>;
}

export interface BackupDestinationTestResult {
    ok: boolean;
    message?: string;
    error?: string;
}

export interface SMSMarginSummary {
    revenue: number;
    provider_cost: number;
    margin: number;
    transaction_count: number;
}

export interface WhatsAppMarginSummary {
    revenue: number;
    provider_cost: number;
    margin: number;
    active_subscriptions: number;
}

export interface MarginSummary {
    sms: SMSMarginSummary;
    whatsapp: WhatsAppMarginSummary;
}

export interface PlatformBillingSettings {
    cost_per_sms?: number;
    provider_cost_per_sms?: number;
    cost_per_whatsapp?: number;
    provider_cost_per_whatsapp?: number;
    min_markup_percentage?: number;
    min_topup_amount?: number;
    treasury_gateway_id?: string;
}

export const platformConfigApi = {
    listPlatformSettings: () =>
        apiClient.get<{ data: ServiceConfigItem[]; total: number }>('/api/v1/platform/config'),

    upsertPlatformSetting: (key: string, body: { config_value: string; description?: string }) =>
        apiClient.put<ServiceConfigItem>(`/api/v1/platform/config/${encodeURIComponent(key)}`, body),

    getPlatformBackupDestination: () =>
        apiClient.get<BackupDestination>('/api/v1/platform/backups/destination'),

    putPlatformBackupDestination: (body: UpsertBackupDestination) =>
        apiClient.put<BackupDestination>('/api/v1/platform/backups/destination', body),

    testPlatformBackupDestination: (body: UpsertBackupDestination) =>
        apiClient.post<BackupDestinationTestResult>('/api/v1/platform/backups/destination/test', body),

    getTenantBackupDestination: () =>
        apiClient.get<BackupDestination>('/api/v1/backups/destination'),

    putTenantBackupDestination: (body: UpsertBackupDestination) =>
        apiClient.put<BackupDestination>('/api/v1/backups/destination', body),

    testTenantBackupDestination: (body: UpsertBackupDestination) =>
        apiClient.post<BackupDestinationTestResult>('/api/v1/backups/destination/test', body),

    getPlatformBilling: () =>
        apiClient.get<PlatformBillingSettings>('/api/v1/platform/billing'),

    updatePlatformBilling: (body: PlatformBillingSettings) =>
        apiClient.post<PlatformBillingSettings>('/api/v1/platform/billing', body),

    getMargin: (params?: { from?: string; to?: string }) => {
        const q = new URLSearchParams();
        if (params?.from) q.set('from', params.from);
        if (params?.to) q.set('to', params.to);
        const qs = q.toString();
        return apiClient.get<MarginSummary>(`/api/v1/platform/billing/margin${qs ? `?${qs}` : ''}`);
    },
};
