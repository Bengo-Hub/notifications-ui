'use client';

import { settingsApi } from '@/lib/api/settings';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface BrandingContextType {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    getServiceTitle: (appName: string) => string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const CODEVERTEX_BRAND = {
    logoUrl: '/images/logo/codevertex.png',
    primaryColor: '#5B1C4D',
    secondaryColor: '#ea8022',
};

export function BrandingProvider({ children }: { children: ReactNode }) {
    const [branding, setBranding] = useState<BrandingContextType>({
        ...CODEVERTEX_BRAND,
        getServiceTitle: (appName: string) => `Codevertex ${appName}`,
    });

    useEffect(() => {
        // Enforce core branding
        document.documentElement.style.setProperty('--primary', CODEVERTEX_BRAND.primaryColor);
        document.documentElement.style.setProperty('--tenant-primary', CODEVERTEX_BRAND.primaryColor);
        document.documentElement.style.setProperty('--tenant-secondary', CODEVERTEX_BRAND.secondaryColor);
        document.documentElement.style.setProperty('--tenant-logo-url', `url(${CODEVERTEX_BRAND.logoUrl})`);
    }, []);

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
