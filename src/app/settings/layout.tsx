'use client';

import { cn } from '@/lib/utils';
import { userCanAccess } from '@/lib/auth/permissions';
import { useAuthStore } from '@/store/auth';
import { Bell, Cloud, Link2, Palette, ShieldCheck, CreditCard, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function SettingsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const user = useAuthStore((state) => state.user);
    const canManageUsers = userCanAccess(user, { permissions: ['notifications.users.manage'] });

    const tabs = [
        { name: 'Providers', href: '/settings/providers', icon: Cloud },
        { name: 'Notifications', href: '/settings/notifications', icon: Bell },
        { name: 'Branding', href: '/settings/branding', icon: Palette },
        { name: 'Integrations', href: '/settings/integrations', icon: Link2 },
        { name: 'Security', href: '/settings/security', icon: ShieldCheck },
        { name: 'Billing', href: '/billing/credits', icon: CreditCard },
        ...(canManageUsers ? [{ name: 'Users & Roles', href: '/settings/users', icon: Users }] : []),
    ];

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
                <p className="text-muted-foreground mt-1">Manage global configurations for your notification ecosystem.</p>
            </div>

            <nav className="border-b border-border overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                                    isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                )}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.name}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className="min-w-0">
                {children}
            </div>
        </div>
    );
}
