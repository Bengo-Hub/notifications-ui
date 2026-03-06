'use client';

import { Header } from '@/components/header';
import { AuthProvider } from '@/providers/auth-provider';
import { ReactNode } from 'react';
import Link from 'next/link';
import { Bell, ArrowLeft } from 'lucide-react';

export default function PlatformLayout({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                <aside className="flex flex-col w-56 border-r border-border bg-card p-4">
                    <Link href="/" className="flex items-center gap-2 mb-8 text-lg font-semibold">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <Bell className="h-4 w-4 text-primary-foreground" />
                        </div>
                        Platform
                    </Link>
                    <nav className="space-y-1">
                        <Link
                            href="/platform/providers"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent"
                        >
                            Providers
                        </Link>
                        <Link
                            href="/platform/tenants"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent"
                        >
                            Tenants
                        </Link>
                        <Link
                            href="/platform/configuration"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent"
                        >
                            Configuration
                        </Link>
                        <Link
                            href="/"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to orgs
                        </Link>
                    </nav>
                </aside>
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto bg-accent/5 p-6">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}
