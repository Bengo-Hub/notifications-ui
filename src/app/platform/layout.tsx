'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Server, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMe } from '@/hooks/useMe';
import { isPlatformOwnerOrSuperuser } from '@/lib/auth/permissions';

const platformTabs = [
    { label: 'Providers', href: '/platform/providers', icon: Server },
    { label: 'Configuration', href: '/platform/configuration', icon: Settings2 },
];

export default function PlatformLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useMe();

    // Platform configuration (provider credentials, service configs) is platform-admin
    // only. Gate the ENTIRE /platform/* section — not just the tab nav — so a tenant
    // admin cannot reach these pages by navigating directly. Defense-in-depth: the API
    // also enforces RoleSuperAdmin on /platform routes.
    const allowed = isPlatformOwnerOrSuperuser(user ?? null);
    useEffect(() => {
        if (user && !allowed) {
            router.replace('/unauthorized');
        }
    }, [user, allowed, router]);

    if (!user || !allowed) {
        return null; // don't render platform config to non-admins while the redirect runs
    }

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6 max-w-7xl mx-auto w-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform</h1>
                <p className="text-muted-foreground mt-1">Shared provider credentials and platform-wide configuration.</p>
            </div>

            <nav className="border-b border-border overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                    {platformTabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = pathname.startsWith(tab.href);
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                                    active
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
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
