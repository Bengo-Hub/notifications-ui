import { apiClient } from '@/lib/api/client';
import { buildAuthorizeUrl, buildLogoutUrl, exchangeCodeForTokens, fetchProfile } from '@/lib/auth/api';
import {
    consumeVerifier,
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
    storeState,
    storeVerifier
} from '@/lib/auth/pkce';
import type { UserProfile } from '@/lib/auth/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
}

interface AuthState {
    status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error' | 'syncing';
    user: UserProfile | null;
    session: Session | null;
    error: string | null;
    isAuthenticated?: boolean;

    /** Subscription info fetched lazily after login (undefined = not started, null = loading). */
    subscriptionInfo: Record<string, unknown> | null | undefined;
    setSubscriptionInfo: (info: Record<string, unknown> | null) => void;

    // Actions
    initialize: () => Promise<void>;
    /** When in tenant context (e.g. route or selection), pass tenant so token is minted for that org. */
    redirectToSSO: (returnTo?: string, tenant?: string) => Promise<void>;
    handleSSOCallback: (code: string, callbackUrl: string) => Promise<void>;
    logout: () => Promise<void>;
    fetchUser: () => Promise<void>;
    setUser: (user: UserProfile | null) => void;
    syncTenantToStorage: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            status: 'idle',
            subscriptionInfo: undefined,
            setSubscriptionInfo: (info: Record<string, unknown> | null) => set({ subscriptionInfo: info }),
            user: null,
            session: null,
            error: null,
            isAuthenticated: false,

        syncTenantToStorage: (user: UserProfile | null) => {
            if (user) {
                localStorage.setItem('tenant_id', user.tenantId || '');
                localStorage.setItem('tenant_slug', user.tenantSlug || '');
                localStorage.setItem('is_platform_owner', (user.isPlatformOwner || user.tenantSlug === 'codevertex').toString());
            } else {
                localStorage.removeItem('tenant_id');
                localStorage.removeItem('tenant_slug');
                localStorage.removeItem('is_platform_owner');
            }
        },

            initialize: async () => {
                const { session } = get();
                if (!session) {
                    set({ status: 'unauthenticated' });
                    return;
                }

                apiClient.setAccessToken(session.accessToken);
                set({ status: 'loading' });

                try {
                    const user = await fetchProfile(session.accessToken);
                    get().syncTenantToStorage(user);
                    set({ user, status: 'authenticated', isAuthenticated: true });
                } catch (error) {
                    console.error('Failed to initialize auth:', error);
                    get().syncTenantToStorage(null);
                    set({ status: 'unauthenticated', session: null, user: null, isAuthenticated: false });
                }
            },

            redirectToSSO: async (returnTo?: string, tenant?: string) => {
                set({ status: 'loading', error: null });
                try {
                    const verifier = generateCodeVerifier();
                    const challenge = await generateCodeChallenge(verifier);
                    const state = generateState();

                    storeVerifier(verifier);
                    storeState(state);

                    if (returnTo && typeof window !== 'undefined') {
                        sessionStorage.setItem('sso_return_to', returnTo);
                    }

                    const callbackUrl = tenant
                        ? `${window.location.origin}/${tenant}/auth/callback`
                        : `${window.location.origin}/auth/callback`;
                    const authorizeUrl = buildAuthorizeUrl({
                        codeChallenge: challenge,
                        state,
                        redirectUri: callbackUrl,
                        tenant,
                    });

                    window.location.href = authorizeUrl;
                } catch (error) {
                    set({ status: 'error', error: 'Failed to start sign-in' });
                    throw error;
                }
            },

            handleSSOCallback: async (code: string, callbackUrl: string) => {
                set({ status: 'syncing', error: null });
                const verifier = consumeVerifier();

                if (!verifier) {
                    set({ status: 'error', error: 'Session expired' });
                    return;
                }

                try {
                    const tokens = await exchangeCodeForTokens({
                        code,
                        codeVerifier: verifier,
                        redirectUri: callbackUrl,
                    });

                    const session: Session = {
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token || '',
                        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                    };

                    apiClient.setAccessToken(session.accessToken);
                    set({ session });

                    let attempts = 0;
                    while (attempts < 5) {
                        try {
                            const user = await fetchProfile(session.accessToken);
                            get().syncTenantToStorage(user);
                            set({ user, status: 'authenticated', isAuthenticated: true });
                            return;
                        } catch {
                            attempts++;
                            await new Promise(r => setTimeout(r, 1500));
                        }
                    }

                    set({ status: 'authenticated' });
                } catch {
                    set({ status: 'error', error: 'Sign-in failed' });
                }
            },

            logout: async () => {
                get().syncTenantToStorage(null);
                set({ status: 'unauthenticated', user: null, session: null, isAuthenticated: false });
                apiClient.setAccessToken(null);

                // Clear persisted storage so re-visit doesn't rehydrate stale session
                try { localStorage.removeItem('notifications-auth-storage'); } catch { /* no-op */ }

                // Redirect to SSO logout which clears the session cookie, then SSO
                // redirects to accounts login page. We do NOT redirect back to
                // notifications because the AuthProvider would immediately re-trigger
                // SSO login (no unauthenticated landing page exists).
                window.location.href = buildLogoutUrl('https://accounts.codevertexitsolutions.com');
            },

            fetchUser: async () => {
                const { session } = get();
                if (!session) return;
                try {
                    const user = await fetchProfile(session.accessToken);
                    get().syncTenantToStorage(user);
                    set({ user, isAuthenticated: true });
                } catch (error) {
                    console.error('Fetch user failed:', error);
                }
            },

            setUser: (user: UserProfile | null) => {
                set({ user, isAuthenticated: !!user });
                get().syncTenantToStorage(user);
            },
        }),
        {
            name: 'notifications-auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state: AuthState) => ({
                session: state.session,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
            // Sync token to apiClient as soon as session is rehydrated so every request has Bearer (fixes 401)
            onRehydrateStorage: () => (state: AuthState | undefined) => {
                if (state?.session?.accessToken) {
                    apiClient.setAccessToken(state.session.accessToken);
                }
                if (state?.user) {
                    state.syncTenantToStorage(state.user);
                }
            },
        }
    )
);
