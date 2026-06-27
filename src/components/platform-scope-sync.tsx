'use client';

import { setPlatformScope } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * PlatformScopeSync — keeps the apiClient's tenant scope in sync with the route.
 *
 * Platform owner (codevertex) is a real business tenant. Outside /platform the owner
 * manages its OWN notifications (send own tenant headers); under /platform it operates
 * the cross-tenant cockpit (omit headers → backend resolves platform-wide from JWT).
 *
 * Sets the scope during render so the very first request on a route already carries the
 * correct headers, and invalidates cached queries when the scope flips so data from the
 * other scope is never shown.
 */
export function PlatformScopeSync() {
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const isPlatform = pathname?.startsWith('/platform') ?? false;
    const prev = useRef<boolean | null>(null);

    // Set synchronously so in-flight requests for this route use the right scope.
    setPlatformScope(isPlatform);

    useEffect(() => {
        if (prev.current !== null && prev.current !== isPlatform) {
            // Scope changed (entered/left /platform): drop cached cross-scope data.
            queryClient.invalidateQueries();
        }
        prev.current = isPlatform;
    }, [isPlatform, queryClient]);

    return null;
}
