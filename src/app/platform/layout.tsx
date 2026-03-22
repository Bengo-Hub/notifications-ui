'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Globe, Server, Settings2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const platformNav = [
    { label: 'Providers', href: '/platform/providers', icon: Server },
    { label: 'Tenants', href: '/platform/tenants', icon: Users },
    { label: 'Configuration', href: '/platform/configuration', icon: Settings2 },
];

export default function PlatformLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden">
            <aside className="hidden md:flex flex-col w-52 border-r border-border bg-card/50 shrink-0">
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">Platform</span>
                    </div>
                </div>
                <nav className="flex-1 p-2 space-y-0.5">
                    {platformNav.map((item) => {
                        const Icon = item.icon;
                        const active = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-2 border-t border-border">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to orgs
                    </Link>
                </div>
            </aside>
            <div className="flex-1 overflow-y-auto p-6">
                {children}
            </div>
        </div>
    );
}
