'use client';

import { settingsApi } from '@/lib/api/settings';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface BrandingContextType {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
    const [branding, setBranding] = useState<BrandingContextType>({
        logoUrl: '/logo.png',
        primaryColor: '#0ea5e9',
        secondaryColor: '#6366f1',
    });

    useEffect(() => {
        loadBranding();
    }, []);

    const loadBranding = async () => {
        try {
            const data = await settingsApi.getBranding();
            if (data) {
                setBranding({
                    logoUrl: data.logo_url || '/logo.png',
                    primaryColor: data.primary_color || '#0ea5e9',
                    secondaryColor: data.secondary_color || '#6366f1',
                });

                // Apply primary color to CSS variable for Tailwind
                document.documentElement.style.setProperty('--primary', data.primary_color || '#0ea5e9');
            }
        } catch (error) {
            console.error('Failed to load branding:', error);
        }
    };

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
