'use client';

import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/providers/auth-provider';
import { BrandingProvider } from '@/providers/branding-provider';
import { ReactNode } from 'react';

export default function OrgLayout({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <BrandingProvider>
                <div className="flex h-screen overflow-hidden bg-background">
                    <Sidebar />
                    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <Header />
                        <main className="flex-1 overflow-y-auto bg-accent/5">
                            {children}
                        </main>
                    </div>
                </div>
            </BrandingProvider>
        </AuthProvider>
    );
}
