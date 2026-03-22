'use client';

import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';
import {
    Activity,
    CreditCard,
    LayoutDashboard,
    LogOut,
    Mail,
    Server,
    Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useMe();
    const isPlatformOwner = user?.isPlatformOwner || user?.tenantSlug === 'codevertex';
    const logout = useAuthStore((s) => s.logout);

    const routes = [
        {
            label: 'Dashboard',
            icon: LayoutDashboard,
            href: '/dashboard',
            active: pathname === '/dashboard',
        },
        {
            label: 'Templates',
            icon: Mail,
            href: '/templates',
            active: pathname.startsWith('/templates'),
        },
        {
            label: 'Monitoring',
            icon: Activity,
            href: '/monitoring',
            active: pathname.startsWith('/monitoring'),
        },
        {
            label: 'Billing',
            icon: CreditCard,
            href: '/billing/credits',
            active: pathname.startsWith('/billing'),
        },
        {
            label: 'Settings',
            icon: Settings,
            href: '/settings/providers',
            active: pathname.startsWith('/settings'),
        },
        ...(isPlatformOwner
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
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    aria-hidden
                    onClick={onClose}
                />
            )}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-300 ease-out md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0 md:min-w-[260px]",
                    open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full bg-card border-r border-border w-full overflow-hidden transition-colors">
                    {/* Logo */}
                    <div className="px-5 pt-5 pb-2">
                        <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo.svg" alt="Codevertex" className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
                            Navigation
                        </p>
                        {routes.map((route) => {
                            const Icon = route.icon;
                            return (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    onClick={onClose}
                                    className={cn(
                                        "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                        route.active
                                            ? "bg-primary/10 text-primary shadow-sm"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                >
                                    <Icon className={cn(
                                        "h-[18px] w-[18px] shrink-0 transition-colors",
                                        route.active ? "text-primary" : "text-muted-foreground/50 group-hover:text-foreground"
                                    )} />
                                    <span>{route.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-3 border-t border-border">
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-accent/50">
                            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {user?.tenantSlug?.[0]?.toUpperCase() || 'C'}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-semibold text-foreground truncate">{user?.tenantSlug || 'Codevertex'}</span>
                                <span className="text-[10px] text-muted-foreground">Notifications</span>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-destructive"
                                title="Sign out"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
