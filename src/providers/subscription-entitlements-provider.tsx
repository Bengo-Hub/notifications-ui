'use client';

import { ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    SubscriptionProvider,
    type FeatureCatalogEntry,
    type SubscriptionEntitlements,
} from '@bengo-hub/shared-ui-lib/subscription';
import { useSubscription } from '@/hooks/use-subscription';

const UPGRADE_BASE =
    process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || 'https://pricing.codevertexitsolutions.com';

interface CatalogItem {
    featureCode: string;
    label?: string;
    serviceTag?: string;
    minPlanCode?: string;
    minTierLabel?: string;
}

/**
 * Bridges the app-local useSubscription hook into the shared-ui-lib SubscriptionProvider so
 * FeatureLock / UpgradeDialog / useFeature work anywhere below the authenticated shell.
 *
 * isExempt mirrors the backend IsGatingExempt funnel: platform owner OR demo OR service-charge
 * billing — exempt tenants see every feature as enabled.
 *
 * The feature catalog (minPlanCode/minTierLabel per feature) is fetched once from the
 * /api/features-catalog proxy so FeatureLock can render "Upgrade to <tier>" + pricing deep-links
 * without a hardcoded per-app feature→tier map.
 */
export function SubscriptionEntitlementsProvider({ children }: { children: ReactNode }) {
    const sub = useSubscription();
    const isExempt = sub.isPlatformOwner || sub.isDemo || sub.isServiceCharge;

    // The catalog is static-ish → fetch once, long cache.
    const { data: catalogData } = useQuery({
        queryKey: ['features-catalog'],
        queryFn: async () => {
            const res = await fetch('/api/features-catalog');
            if (!res.ok) return { features: [] as CatalogItem[] };
            return (await res.json()) as { features: CatalogItem[] };
        },
        staleTime: 60 * 60 * 1000,
        retry: false,
    });

    const catalog = useMemo<Record<string, FeatureCatalogEntry>>(() => {
        const map: Record<string, FeatureCatalogEntry> = {};
        for (const f of catalogData?.features ?? []) {
            map[f.featureCode] = {
                minPlanCode: f.minPlanCode,
                minTierLabel: f.minTierLabel,
                serviceTag: f.serviceTag,
                label: f.label,
            };
        }
        return map;
    }, [catalogData]);

    const value = useMemo<SubscriptionEntitlements>(
        () => ({
            features: sub.info?.features ?? [],
            limits: (sub.info?.limits as Record<string, number>) ?? {},
            isExempt,
            status: sub.status,
            isLoading: sub.isLoading,
            planCode: sub.plan,
            catalog,
            upgradeBaseUrl: UPGRADE_BASE,
        }),
        [sub.info?.features, sub.info?.limits, isExempt, sub.status, sub.isLoading, sub.plan, catalog]
    );

    return <SubscriptionProvider value={value}>{children}</SubscriptionProvider>;
}
