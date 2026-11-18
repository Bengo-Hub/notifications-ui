import { setApiAccessToken } from '@/lib/api/client';
import { buildAuthorizeUrl, buildLogoutUrl, exchangeCodeForTokens, fetchProfile, revokeServerSession } from '@/lib/auth/api';
import {
    consumeVerifier,
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
    storeState,
    storeVerifier
} from '@/lib/auth/pkce';
import { cookieMode } from '@/lib/auth/session-mode';
import type { UserProfile } from '@/lib/auth/types';
import { scrubStoredSession } from '@bengo-hub/shared-ui-lib/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const AUTH_STORAGE_KEY = 'notifications-auth-storage';

// Cookie session (fleet plan G11): tokens an earlier build stored are dropped before the store
// loads; from here on only the profile is persisted.
if (cookieMode()) scrubStoredSession(AUTH_STORAGE_KEY);

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
    lastAuthenticatedAt: number | null;

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
            lastAuthenticatedAt: null,

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
                if (cookieMode()) {
                    // No token is stored: a known profile gets its first token through the sso cookie.
                    const known = get().user;
                    if (!known) {
                        set({ status: 'unauthenticated' });
                        return;
                    }
                    set({ status: 'loading' });
                    const { getCookieSession } = await import('@/lib/auth/cookie-session');
                    const token = await getCookieSession().getAccessToken();
                    if (!token) {
                        get().syncTenantToStorage(null);
                        set({ status: 'unauthenticated', session: null, user: null, isAuthenticated: false });
                        return;
                    }
                    try {
                        // Same as the stored-token flow: the profile is re-read on every load.
                        const user = await fetchProfile(token);
                        get().syncTenantToStorage(user);
                        set({ user, status: 'authenticated', isAuthenticated: true, lastAuthenticatedAt: Date.now() });
                    } catch (error) {
                        console.error('Failed to initialize auth:', error);
                        get().syncTenantToStorage(null);
                        set({ status: 'unauthenticated', session: null, user: null, isAuthenticated: false });
                    }
                    return;
                }
                const { session } = get();
                if (!session) {
                    set({ status: 'unauthenticated' });
                    return;
                }

                setApiAccessToken(session.accessToken);
                set({ status: 'loading' });

                // Expired token on reload: renew it with the refresh token (one small call) instead of a
                // full SSO sign-in; a known profile is kept. Dynamic import: token-refresh imports this store.
                const expiringOnLoad = !session.expiresAt || Date.now() >= new Date(session.expiresAt).getTime() - 60_000;
                const renewedOnLoad = session.refreshToken && expiringOnLoad
                  ? await (await import('@/lib/auth/token-refresh')).refreshAccessToken(session.accessToken)
                  : null;
                if (renewedOnLoad) {
                  setApiAccessToken(renewedOnLoad);
                }
                try {
                    const user = await fetchProfile(get().session?.accessToken ?? session.accessToken);
                    get().syncTenantToStorage(user);
                    set({ user, status: 'authenticated', isAuthenticated: true, lastAuthenticatedAt: Date.now() });
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

                    let session: Session = {
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token || '',
                        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                    };

                    if (cookieMode()) {
                        // The refresh token goes into auth-api's HttpOnly cookie and is dropped here; the
                        // store holds only the in-memory access token the cookie session hands back.
                        const { getCookieSession } = await import('@/lib/auth/cookie-session');
                        // A new sign-in replaces whoever was stored, so it is not taken for a user switch.
                        set({ user: null, session: null });
                        const started = await getCookieSession().start(tokens.refresh_token || '');
                        const mirrored = useAuthStore.getState().session;
                        if (!('token' in started) || !mirrored) {
                            set({ status: 'error', error: 'Sign-in failed' });
                            return;
                        }
                        session = mirrored;
                    } else {
                        setApiAccessToken(session.accessToken);
                        set({ session });
                    }

                    let attempts = 0;
                    while (attempts < 5) {
                        try {
                            const user = await fetchProfile(session.accessToken);
                            get().syncTenantToStorage(user);
                            set({ user, status: 'authenticated', isAuthenticated: true, lastAuthenticatedAt: Date.now() });
                            return;
                        } catch {
                            attempts++;
                            await new Promise(r => setTimeout(r, 1500));
                        }
                    }

                    set({ status: 'authenticated', lastAuthenticatedAt: Date.now() });
                } catch {
                    set({ status: 'error', error: 'Sign-in failed' });
                }
            },

            logout: async () => {
                // Revoke the backend session (Redis session_token keys + DB sessions)
                // while the access token is still available.
                if (cookieMode()) {
                    // Revokes the session, clears the sso cookie and signs the other tabs out.
                    const { getCookieSession } = await import('@/lib/auth/cookie-session');
                    await getCookieSession().end();
                } else {
                    const token = get().session?.accessToken;
                    await revokeServerSession(token);
                }

                get().syncTenantToStorage(null);
                set({ status: 'unauthenticated', user: null, session: null, isAuthenticated: false, lastAuthenticatedAt: null });
                setApiAccessToken(null);

                // Clear persisted storage so re-visit doesn't rehydrate stale session
                try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* no-op */ }
                try { sessionStorage.clear(); } catch { /* no-op */ }

                // Redirect to the SSO login page with a return_to back to this service.
                const returnTo = encodeURIComponent(window.location.origin);
                window.location.href = buildLogoutUrl(`https://accounts.codevertexafrica.com/login?return_to=${returnTo}`);
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
            name: AUTH_STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            // The cookie session persists the profile only; the access token stays in memory.
            partialize: (state: AuthState) =>
                cookieMode()
                    ? { user: state.user, isAuthenticated: state.isAuthenticated }
                    : { session: state.session, user: state.user, isAuthenticated: state.isAuthenticated },
            // Sync token to apiClient as soon as session is rehydrated so every request has Bearer (fixes 401)
            onRehydrateStorage: () => (state: AuthState | undefined) => {
                if (state?.session?.accessToken) {
                    setApiAccessToken(state.session.accessToken);
                }
                if (state?.user) {
                    state.syncTenantToStorage(state.user);
                }
            },
        }
    )
);
