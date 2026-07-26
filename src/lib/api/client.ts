import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Must point to notifications API host (not the UI host). NEXT_PUBLIC_* are inlined at build time.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://notificationsapi.codevertexafrica.com';

/** Registered by app-providers to clear queryClient + auth store on 401 */
let on401Callback: (() => void) | null = null;
export function setOn401(cb: (() => void) | null) {
    on401Callback = cb;
}

/**
 * Platform-scope toggle (platform owners only).
 *
 * notifications-ui is BOTH a per-tenant app (own dashboard/billing/settings) AND a
 * platform tool (/platform/*). The platform owner (codevertex) is a real business
 * tenant that must default to managing its OWN notifications, with cross-tenant /
 * platform-wide access confined to the dedicated /platform section.
 *
 * `platformScope` is kept in sync with the route by `PlatformScopeSync` in the shell:
 *  - true  => under /platform/* — omit tenant headers so the backend resolves
 *             platform-wide scope from the owner's JWT claims (cockpit behaviour).
 *  - false => everywhere else — send the owner's OWN tenant headers (codevertex),
 *             so business pages show the owner's own data by default.
 * For regular tenants this flag is irrelevant; they always send their own headers.
 */
let platformScope = false;
export function setPlatformScope(isPlatform: boolean) {
    platformScope = isPlatform;
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

        // Tenant Identification Headers.
        // Regular tenants always send their own tenant headers.
        // Platform owners default to their OWN tenant (codevertex) on business pages,
        // and only go platform-wide (omit headers → backend resolves from JWT claims)
        // when drilled into the dedicated /platform section (platformScope=true).
        const isPlatformOwner = localStorage.getItem('is_platform_owner') === 'true';
        const goPlatformWide = isPlatformOwner && platformScope;

        if (!goPlatformWide) {
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

    private handleError = async (error: any) => {
        if (error.response?.status === 401) {
            // If token is already cleared (explicit logout in progress), skip entirely
            if (!this.accessToken) return Promise.reject(error);

            const url: string = error.config?.url ?? '';
            if (!url.includes('/auth/me') && !error.config?._retried) {
                // Attempt token refresh before triggering logout
                const { refreshAccessToken } = await import('@/lib/auth/token-refresh');
                const newToken = await refreshAccessToken();

                if (newToken) {
                    this.accessToken = newToken;
                    error.config._retried = true;
                    error.config.headers.Authorization = `Bearer ${newToken}`;
                    return this.instance.request(error.config);
                }

                // Refresh failed — fire logout callback
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
