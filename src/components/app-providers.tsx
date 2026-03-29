'use client';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { setOn401 } from '@/lib/api/client';
import { AuthProvider } from '@/providers/auth-provider';
import { BrandingProvider } from '@/providers/branding-provider';
import { useAuthStore } from '@/store/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { SubscriptionBanner } from '@/components/subscription/subscription-banner';
import { ReactNode, useEffect, useState } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000,
                        gcTime: 10 * 60 * 1000,
                        retry: 2,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Register global 401 handler: clear all cached queries + logout
    useEffect(() => {
        setOn401(() => {
            queryClient.clear();
            useAuthStore.getState().logout();
        });
    }, [queryClient]);

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
            >
                <AuthProvider>
                    <BrandingProvider>
                        <div className="flex h-screen overflow-hidden bg-background">
                            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                                <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
                                <SubscriptionBanner />
                                <main className="flex-1 overflow-y-auto bg-background">
                                    <div className="min-h-full flex flex-col">
                                        <div className="flex-1">{children}</div>
                                        <Footer />
                                    </div>
                                </main>
                            </div>
                        </div>
                    </BrandingProvider>
                </AuthProvider>
                <Toaster richColors position="top-right" />
            </ThemeProvider>
        </QueryClientProvider>
    );
}
