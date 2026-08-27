'use client';

import { useTenantFilterStore } from '@/store/tenant-filter';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * TenantFilterSync — invalidates cached queries whenever a platform owner switches (or clears)
 * the top-nav tenant selection, so pages don't keep showing the previously-selected tenant's
 * cached data after the acting-tenant changes. Mirrors PlatformScopeSync's pattern for the
 * platformScope flag, applied to the tenant-filter store instead: a blanket invalidateQueries()
 * on change rather than threading selectedTenant?.id into every individual query key across the
 * app — same practical effect (nothing stale survives a switch), far less surface to keep in
 * sync as new tenant-scoped pages/hooks are added.
 */
export function TenantFilterSync() {
    const selectedTenantId = useTenantFilterStore((s) => s.selectedTenant?.id ?? null);
    const queryClient = useQueryClient();
    const prev = useRef<string | null>(null);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current && prev.current !== selectedTenantId) {
            queryClient.invalidateQueries();
        }
        prev.current = selectedTenantId;
        initialized.current = true;
    }, [selectedTenantId, queryClient]);

    return null;
}
