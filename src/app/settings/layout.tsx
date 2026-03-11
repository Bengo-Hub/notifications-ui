'use client';

import { cn } from '@/lib/utils';
import { Cloud, Palette, ShieldCheck, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function SettingsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        { name: 'Providers', href: '/settings/providers', icon: Cloud },
        { name: 'Branding', href: '/settings/branding', icon: Palette },
        { name: 'Security', href: '/settings/security', icon: ShieldCheck },
        { name: 'Billing', href: '/billing/credits', icon: CreditCard },
    ];

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
                <p className="text-muted-foreground mt-1">Manage global configurations for your notification ecosystem.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-64 space-y-1">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.name}
                            </Link>
                        );
                    })}
                </aside>

                <div className="flex-1 min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
