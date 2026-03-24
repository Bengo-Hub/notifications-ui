'use client';

import React, { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';

interface BrandingContextType {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    getServiceTitle: (appName: string) => string;
    isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const CODEVERTEX_BRAND = {
    logoUrl: '/images/logo/codevertex.png',
    primaryColor: '#5B1C4D',
    secondaryColor: '#ea8022',
};

const SSO_BASE_URL = process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.codevertexitsolutions.com';

interface TenantBrandingResponse {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
    name?: string;
}

async function fetchTenantBranding(accessToken: string, tenantSlug: string): Promise<TenantBrandingResponse> {
    const res = await fetch(`${SSO_BASE_URL}/api/v1/tenants/${tenantSlug}/branding`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch tenant branding: ${res.status}`);
    }
    return res.json();
}

export function BrandingProvider({ children }: { children: ReactNode }) {
    const session = useAuthStore((s) => s.session);
    const user = useAuthStore((s) => s.user);
    const tenantSlug = user?.tenantSlug || '';

    const { data: remoteBranding, isLoading } = useQuery({
        queryKey: ['tenant-branding', tenantSlug],
        queryFn: () => fetchTenantBranding(session!.accessToken, tenantSlug),
        enabled: !!session?.accessToken && !!tenantSlug,
        staleTime: 6 * 60 * 60 * 1000, // 6 hours — match JWT TTL
        gcTime: 7 * 60 * 60 * 1000,
        retry: 1,
    });

    const branding = useMemo<BrandingContextType>(() => ({
        logoUrl: remoteBranding?.logo_url || CODEVERTEX_BRAND.logoUrl,
        primaryColor: remoteBranding?.primary_color || CODEVERTEX_BRAND.primaryColor,
        secondaryColor: remoteBranding?.secondary_color || CODEVERTEX_BRAND.secondaryColor,
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
