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

export const analyticsApi = {
    getDeliveryStats: (orgSlug: string, range: string = '24h') =>
        apiClient.get<DeliveryStats>(`/api/v1/analytics/delivery/${orgSlug}?range=${range}`),

    getActivityLogs: (orgSlug: string, limit: number = 20) =>
        apiClient.get<ActivityLog[]>(`/api/v1/analytics/logs/${orgSlug}?limit=${limit}`),
};
