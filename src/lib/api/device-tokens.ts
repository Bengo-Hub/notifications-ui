import { apiClient } from './client';

export const deviceTokensApi = {
    register: (token: string) =>
        apiClient.post<{ message: string }>('/api/v1/push/tokens', {
            token,
            platform: 'web',
            provider: 'fcm',
        }),
};
