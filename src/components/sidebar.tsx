'use client';

import { useMe } from '@/hooks/useMe';
import { canAccessPlatform } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import {
    Activity,
    Bell,
    LayoutDashboard,
    Mail,
    Server,
    Settings,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
    const pathname = usePathname();
    const params = useParams();
    const orgSlug = params?.orgSlug as string;
    const { user } = useMe();
    const showPlatform = canAccessPlatform(user ?? undefined);

    const routes = [
        {
            label: 'Dashboard',
            icon: LayoutDashboard,
            href: `/${orgSlug}/dashboard`,
            active: pathname === `/${orgSlug}/dashboard`,
        },
        {
            label: 'Templates',
            icon: Mail,
            href: `/${orgSlug}/templates`,
            active: pathname.startsWith(`/${orgSlug}/templates`),
        },
        {
            label: 'Monitoring',
            icon: Activity,
            href: `/${orgSlug}/monitoring`,
            active: pathname.startsWith(`/${orgSlug}/monitoring`),
        },
        {
            label: 'Settings',
            icon: Settings,
            href: `/${orgSlug}/settings/providers`,
            active: pathname.startsWith(`/${orgSlug}/settings`),
        },
        ...(showPlatform
            ? [{
                label: 'Platform',
                icon: Server,
                href: '/platform/providers',
                active: pathname.startsWith('/platform'),
            }]
            : []),
    ];

    return (
        <>
            {/* Mobile overlay when sidebar is open */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    aria-hidden
                    onClick={onClose}
                />
            )}
            <div
                className={cn(
                    "space-y-4 py-4 flex flex-col h-full bg-card border-r border-border w-[240px] min-w-[240px] z-50 transition-transform duration-200 ease-in-out",
                    "fixed inset-y-0 left-0 md:relative md:left-auto md:translate-x-0",
                    open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="px-3 py-2 flex-1">
                    <div className="flex items-center justify-between pl-3 mb-14">
                    <Link href={`/${orgSlug}/dashboard`} className="flex items-center" onClick={onClose}>
                    <div className="relative w-8 h-8 mr-3 bg-primary rounded-lg flex items-center justify-center">
                        <Bell className="text-primary-foreground h-5 w-5" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">
                        TruLoad Notif
                    </h1>
                </Link>
                    <button type="button" onClick={onClose} className="md:hidden p-2 rounded-lg hover:bg-accent" aria-label="Close menu">
                        <X className="h-5 w-5" />
                    </button>
                    </div>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            onClick={onClose}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-accent/50 rounded-lg transition",
                                route.active ? "bg-accent text-foreground" : "text-muted-foreground"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.active ? "text-primary" : "text-muted-foreground")} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="px-3 py-2 border-t border-border">
                <div className="p-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                    Organization
                </div>
                <div className="flex items-center px-3 py-2 gap-3 text-sm font-medium">
                    <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary capitalize">
                        {orgSlug?.[0]}
                    </div>
                    <span className="capitalize">{orgSlug?.replace('-', ' ')}</span>
                </div>
            </div>
        </div>
        </>
    );
}
