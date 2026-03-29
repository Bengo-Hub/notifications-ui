import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Must point to notifications API host (not the UI host). NEXT_PUBLIC_* are inlined at build time.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://notificationsapi.codevertexitsolutions.com';

/** Registered by app-providers to clear queryClient + auth store on 401 */
let on401Callback: (() => void) | null = null;
export function setOn401(cb: () => void) {
    on401Callback = cb;
}

class ApiClient {
    private instance: AxiosInstance;
    private accessToken: string | null = null;

    constructor() {
        this.instance = axios.create({
            baseURL: apiBaseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });

        this.instance.interceptors.request.use(this.handleRequest);
        this.instance.interceptors.response.use(this.handleResponse, this.handleError);
    }

    private handleRequest = (config: InternalAxiosRequestConfig) => {
        if (this.accessToken) {
            config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        // Tenant Identification Headers — only for tenant-scoped users.
        // Platform owners have access to all tenants and must NOT send
        // tenant headers; the backend resolves scope from JWT claims.
        const isPlatformOwner = localStorage.getItem('is_platform_owner') === 'true';

        if (!isPlatformOwner) {
            const tenantId = localStorage.getItem('tenant_id');
            const tenantSlug = localStorage.getItem('tenant_slug');
            if (tenantId) {
                config.headers['X-Tenant-ID'] = tenantId;
            }
            if (tenantSlug) {
                config.headers['X-Tenant-Slug'] = tenantSlug;
            }
        }

        return config;
    };

    private handleResponse = (response: AxiosResponse) => response;

    private onSubscription403Callback: ((data: any) => void) | null = null;

    /** Register a callback for subscription-related 403 errors (code=subscription_inactive, upgrade=true). */
    public setOnSubscription403(callback: ((data: any) => void) | null) {
        this.onSubscription403Callback = callback;
    }

    private handleError = (error: any) => {
        if (error.response?.status === 401) {
            const url: string = error.config?.url ?? '';
            // Do not auto-logout for /auth/me — it may 401 before JIT sync completes.
            // Only auto-logout for regular API calls where 401 means token is invalid.
            if (!url.includes('/auth/me')) {
                console.warn('API 401 — triggering logout');
                on401Callback?.();
            }
        }
        if (error.response?.status === 403 && this.onSubscription403Callback) {
            const data = error.response?.data;
            if (data?.code === 'subscription_inactive' || data?.upgrade === true) {
                this.onSubscription403Callback(data);
            }
        }
        return Promise.reject(error);
    };

    public setAccessToken(token: string | null) {
        this.accessToken = token;
    }

    public get<T>(url: string, params?: any): Promise<T> {
        return this.instance.get<T>(url, { params }).then((res: AxiosResponse<T>) => res.data);
    }

    public post<T>(url: string, data?: any): Promise<T> {
        return this.instance.post<T>(url, data).then((res: AxiosResponse<T>) => res.data);
    }

    public put<T>(url: string, data?: any): Promise<T> {
        return this.instance.put<T>(url, data).then((res: AxiosResponse<T>) => res.data);
    }

    public patch<T>(url: string, data?: any): Promise<T> {
        return this.instance.patch<T>(url, data).then((res: AxiosResponse<T>) => res.data);
    }

    public delete<T>(url: string): Promise<T> {
        return this.instance.delete<T>(url).then((res: AxiosResponse<T>) => res.data);
    }
}

export const apiClient = new ApiClient();
