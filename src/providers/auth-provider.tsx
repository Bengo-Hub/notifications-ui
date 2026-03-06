'use client';

import { useMe } from '@/hooks/useMe';
import { canAccessPlatform } from '@/lib/auth/roles';
import { useAuthStore } from '@/store/auth';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

/**
 * AuthProvider - manages global authentication state and redirection.
 * Uses TanStack Query (useMe) for GET /me with TTL; roles/permissions drive nav and route protection.
 * Redirects: unauthenticated -> SSO login; 401 from /me -> login; authenticated but no permission for /platform -> 403 unauthorized.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const { status, initialize } = useAuthStore();
    const { user, isLoading: meLoading, isError: meError } = useMe();
    const pathname = usePathname();
    const params = useParams();
    const router = useRouter();
    const orgSlug = params?.orgSlug as string;

    useEffect(() => {
        initialize();
    }, [initialize]);

    // Unauthenticated: redirect to SSO
    useEffect(() => {
        if (status === 'idle' && !pathname?.includes('/auth')) {
            if (orgSlug) {
                useAuthStore.getState().redirectToSSO(orgSlug, window.location.href);
            }
        }
    }, [status, pathname, orgSlug]);

    // 401 on /me: redirect to login (SSO)
    useEffect(() => {
        if (meError && orgSlug && !pathname?.includes('/auth')) {
            useAuthStore.getState().redirectToSSO(orgSlug, window.location.href);
        }
    }, [meError, orgSlug, pathname]);

    // Authenticated but accessing /platform without permission -> 403 unauthorized
    useEffect(() => {
        if (status === 'authenticated' && user && pathname?.startsWith('/platform') && !canAccessPlatform(user)) {
            router.replace(orgSlug ? `/${orgSlug}/unauthorized` : '/unauthorized');
        }
    }, [status, user, pathname, orgSlug, router]);

    const loading = status === 'loading' || (status === 'authenticated' && meLoading);
    if (loading && !pathname?.includes('/auth')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Initializing session...</div>
            </div>
        );
    }

    return <>{children}</>;
}
