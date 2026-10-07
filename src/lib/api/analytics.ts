import { apiClient } from './client';
import { useTenantFilterStore } from '@/store/tenant-filter';

export interface DeliveryStats {
    totalSent: number;
    failed?: number;
    skipped?: number;
    deliveryRate: number;
    errorRate: number;
    // Record, not a fixed shape — the backend seeds email/sms/whatsapp/push at zero but a new
    // channel added later shouldn't need a type change here to show up.
    channelBreakdown: Record<string, number>;
    timeSeries: {
        date: string;
        sent: number;
        delivered: number;
    }[];
    scope?: 'tenant' | 'platform';
}

export interface ActivityLog {
    id: string;
    templateName: string;
    channel: string;
    /** Always masked by the API (t***@example.com, +254*****678, "2 devices"). */
    recipient: string;
    status: 'sent' | 'delivered' | 'failed' | 'skipped';
    timestamp: string;
}

export interface ActivityLogsPage {
    logs: ActivityLog[];
    total: number;
}

export interface ActivityLogFilters {
    limit?: number;
    offset?: number;
    channel?: string;
    status?: string;
    /** RFC3339 lower bound — pass the same cutoff used for getDeliveryStats' `range` so the
     *  Live Activity Feed and the KPI cards above it reflect the same window instead of the
     *  feed silently showing older history the cards don't count. */
    from?: string;
}

/**
 * "All Tenants" for a platform owner means every tenant's numbers: ask for scope=all when no
 * tenant is picked in the switcher. Ignored by the API for anyone who is not a platform owner.
 */
function platformWide(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('is_platform_owner') === 'true' && !useTenantFilterStore.getState().selectedTenant;
}

export const analyticsApi = {
    getDeliveryStats: (range: string = '24h') => {
        const params = new URLSearchParams({ range });
        if (platformWide()) params.set('scope', 'all');
        return apiClient.get<DeliveryStats>(`/api/v1/analytics/delivery?${params.toString()}`);
    },

    getActivityLogs: (limit: number = 20, filters?: ActivityLogFilters) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (filters?.offset != null) params.set('offset', String(filters.offset));
        if (filters?.channel) params.set('channel', filters.channel);
        if (filters?.status) params.set('status', filters.status);
        if (filters?.from) params.set('from', filters.from);
        if (platformWide()) params.set('scope', 'all');
        return apiClient.get<ActivityLogsPage>(`/api/v1/analytics/logs?${params.toString()}`);
    },
};
