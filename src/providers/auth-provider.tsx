'use client';

import { useAuthStore } from '@/store/auth';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

/**
 * AuthProvider - manages global authentication state and redirection.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const { status, initialize, user } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const orgSlug = params?.orgSlug as string;

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (status === 'idle' && !pathname?.includes('/auth')) {
            // If we are on a protected route and not authenticated, redirect to login or SSO
            // For now, let's just trigger SSO redirect if we have an orgSlug
            if (orgSlug) {
                useAuthStore.getState().redirectToSSO(orgSlug, window.location.href);
            }
        }
    }, [status, pathname, orgSlug]);

    // Loading state for protected routes
    if (status === 'loading' && !pathname?.includes('/auth')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Initializing session...</div>
            </div>
        );
    }

    return <>{children}</>;
}
