'use client';

import React, { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';

interface BrandingContextType {
    logoUrl: string;
    /** True when a real, tenant-uploaded logo was returned — false when logoUrl is just the
     *  generic CodeVertex fallback (no tenant logo configured, or the fetch hasn't resolved yet). */
    hasCustomLogo: boolean;
    primaryColor: string;
    secondaryColor: string;
    getServiceTitle: (appName: string) => string;
    isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const CODEVERTEX_BRAND = {
    logoUrl: '/logo/logo.png',
    primaryColor: '#5B1C4D',
    secondaryColor: '#ea8022',
};

const SSO_BASE_URL = process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.codevertexafrica.com';

// Mirrors auth-api's real PublicTenantResponse shape (GET /api/v1/tenants/by-slug/{slug}) —
// brand colours live under brand_colors.{primary,secondary,accent}, NOT as flat
// primary_color/secondary_color fields. A flat decode against this endpoint silently yields
// empty colours (see erp-api's internal/platform/auth/branding.go, which hit the same shape
// mismatch first).
interface TenantBrandingResponse {
    logo_url?: string;
    name?: string;
    brand_colors?: {
        primary?: string;
        secondary?: string;
        accent?: string;
    };
}

// Public endpoint, no auth required — same one erp-api/treasury-api/pos-api already read tenant
// branding from (auth-api's GetTenantBySlugPublic). Using the tenant-scoped resolver here (rather
// than a token-gated route) is what lets a platform owner correctly see a DIFFERENT tenant's real
// logo/colours when acting on their behalf via the tenant switcher, instead of silently falling
// back to the platform's own CodeVertex branding.
async function fetchTenantBranding(tenantSlug: string): Promise<TenantBrandingResponse> {
    const res = await fetch(`${SSO_BASE_URL}/api/v1/tenants/by-slug/${tenantSlug}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch tenant branding: ${res.status}`);
    }
    return res.json();
}

export function BrandingProvider({ children }: { children: ReactNode }) {
    const user = useAuthStore((s) => s.user);
    // A platform owner acting on a selected tenant (top-nav TenantFilter) sees THAT tenant's
    // branding instead of their own — explicit product decision (differs from subscriptions-ui's
    // own branding provider, which never follows its equivalent switcher).
    const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);
    const tenantSlug = selectedTenant?.slug || user?.tenantSlug || '';

    const { data: remoteBranding, isLoading } = useQuery({
        queryKey: ['tenant-branding', tenantSlug],
        queryFn: () => fetchTenantBranding(tenantSlug),
        enabled: !!tenantSlug,
        staleTime: 6 * 60 * 60 * 1000, // 6 hours — match JWT TTL
        gcTime: 7 * 60 * 60 * 1000,
        retry: 1,
    });

    const branding = useMemo<BrandingContextType>(() => ({
        logoUrl: remoteBranding?.logo_url || CODEVERTEX_BRAND.logoUrl,
        hasCustomLogo: !!remoteBranding?.logo_url,
        primaryColor: remoteBranding?.brand_colors?.primary || CODEVERTEX_BRAND.primaryColor,
        secondaryColor: remoteBranding?.brand_colors?.secondary || CODEVERTEX_BRAND.secondaryColor,
        getServiceTitle: (appName: string) => `Codevertex ${appName}`,
        isLoading,
    }), [remoteBranding, isLoading]);

    useEffect(() => {
        document.documentElement.style.setProperty('--primary', branding.primaryColor);
        document.documentElement.style.setProperty('--tenant-primary', branding.primaryColor);
        document.documentElement.style.setProperty('--tenant-secondary', branding.secondaryColor);
        document.documentElement.style.setProperty('--tenant-logo-url', `url(${branding.logoUrl})`);
    }, [branding.primaryColor, branding.secondaryColor, branding.logoUrl]);

    return (
        <BrandingContext.Provider value={branding}>
            {children}
        </BrandingContext.Provider>
    );
}

export const useBranding = () => {
    const context = useContext(BrandingContext);
    if (!context) throw new Error('useBranding must be used within BrandingProvider');
    return context;
};
