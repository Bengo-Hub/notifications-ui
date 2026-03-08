import { apiClient } from './client';

export interface DeliveryStats {
    totalSent: number;
    deliveryRate: number;
    errorRate: number;
    channelBreakdown: {
        email: number;
        sms: number;
        push: number;
    };
    timeSeries: {
        date: string;
        sent: number;
        delivered: number;
    }[];
}

export interface ActivityLog {
    id: string;
    templateName: string;
    channel: string;
    recipient: string;
    status: 'sent' | 'delivered' | 'failed';
    timestamp: string;
}

export interface ActivityLogFilters {
    limit?: number;
    offset?: number;
    channel?: string;
    status?: string;
}

export const analyticsApi = {
    getDeliveryStats: (orgSlug: string, range: string = '24h') =>
        apiClient.get<DeliveryStats>(`/api/v1/analytics/delivery/${orgSlug}?range=${range}`),

    getActivityLogs: (orgSlug: string, limit: number = 20, filters?: ActivityLogFilters) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (filters?.offset != null) params.set('offset', String(filters.offset));
        if (filters?.channel) params.set('channel', filters.channel);
        if (filters?.status) params.set('status', filters.status);
        return apiClient.get<ActivityLog[]>(`/api/v1/analytics/logs/${orgSlug}?${params.toString()}`);
    },
};
