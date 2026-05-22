'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, MessageCircle } from 'lucide-react';

const tabs = [
    { label: 'SMS Credits', href: '/billing/credits', icon: MessageSquare },
    { label: 'WhatsApp', href: '/billing/whatsapp', icon: MessageCircle },
];

export default function BillingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="border-b border-border bg-background">
                <div className="max-w-7xl mx-auto px-6">
                    <nav className="flex gap-1" aria-label="Billing navigation">
                        {tabs.map((tab) => {
                            const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
                            const Icon = tab.icon;
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px
                                        ${active
                                            ? 'border-primary text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
}
