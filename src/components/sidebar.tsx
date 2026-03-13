'use client';

import { useMe } from '@/hooks/useMe';
import { canAccessPlatform } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import {
    Activity,
    Bell,
    CreditCard,
    LayoutDashboard,
    Mail,
    Server,
    Settings,
    X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useMe();
    const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
    const tenantSlug = user?.tenant_slug || '';

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
            {/* Mobile overlay when sidebar is open */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    aria-hidden
                    onClick={onClose}
                />
            )}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col transition-transform duration-300 md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0 md:min-w-[280px]",
                    open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="space-y-4 py-6 flex flex-col h-full bg-brand-dark text-white border-r border-white/10 w-full overflow-hidden">
                    <div className="px-6 py-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
                        <Link href="/dashboard" className="flex items-center justify-center mb-10 transition-all hover:scale-105 duration-500" onClick={onClose}>
                            <img src="/logo.svg" alt="Codevertex" className="h-12 w-auto object-contain drop-shadow-2xl" />
                        </Link>

                        <div className="space-y-1 mt-4">
                            <div className="px-6 pb-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                                    Notification Node
                                </p>
                            </div>
                            {routes.map((route) => {
                                const Icon = route.icon;
                                return (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        onClick={onClose}
                                        className={cn(
                                            "group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                            route.active 
                                                ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                                : "text-white/50 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", route.active ? "text-white" : "group-hover:text-white")} />
                                        <span className="font-bold text-xs uppercase tracking-widest">{route.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/10 mt-auto">
                        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 text-white/70">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-black text-primary uppercase shadow-inner">
                                CV
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-black text-[10px] uppercase tracking-widest truncate">Codevertex</span>
                                <span className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">Event Router</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
