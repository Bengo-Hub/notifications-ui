'use client';

import { useMe } from '@/hooks/useMe';
import { canAccessPlatform } from '@/lib/auth/roles';
import { useAuthStore } from '@/store/auth';
import { usePathname, useRouter } from 'next/navigation';
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
    const router = useRouter();

    // Unauthenticated: redirect to SSO
    useEffect(() => {
        const checkAuth = async () => {
            if (status === 'idle') {
                await initialize();
            }
            if (useAuthStore.getState().status === 'unauthenticated' && !pathname?.includes('/auth')) {
                useAuthStore.getState().redirectToSSO(window.location.href);
            }
        };
        checkAuth();
    }, [status, pathname, initialize]);

    // 401 on /me: redirect to login (SSO)
    useEffect(() => {
        if (meError && !pathname?.includes('/auth')) {
            useAuthStore.getState().redirectToSSO(window.location.href);
        }
    }, [meError, pathname]);

    // Authenticated but accessing /platform without permission -> 403 unauthorized
    useEffect(() => {
        if (status === 'authenticated' && user && pathname?.startsWith('/platform') && !canAccessPlatform(user)) {
            router.replace('/unauthorized');
        }
    }, [status, user, pathname, router]);

    // Show loading until we know auth state so dashboard never flashes before SSO redirect
    const loading =
        status === 'loading' ||
        status === 'idle' ||
        (status === 'authenticated' && meLoading);
    if (loading && !pathname?.includes('/auth')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Initializing session...</div>
            </div>
        );
    }

    return <>{children}</>;
}
