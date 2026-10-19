'use client';

import { useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { OverviewCards } from '@/components/platform/messaging/overview-cards';
import { TenantTable } from '@/components/platform/messaging/tenant-table';
import { SERVICE_LABEL, SERVICES } from '@/components/platform/messaging/format';
import type { AdminCreditService } from '@/lib/api/credits-admin';
import { cn } from '@/lib/utils';

export default function PlatformMessagingPage() {
    const [service, setService] = useState<AdminCreditService>('sms');

    return (
        <div className="w-full space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MessagesSquare className="h-6 w-6" />
                    Messaging
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Who holds SMS and WhatsApp balances, plans and unpaid overage. Grant units to a tenant from the table.
                    The overage cap is under Configuration.
                </p>
            </div>

            <div role="tablist" aria-label="Service" className="inline-flex rounded-xl border border-border bg-card p-1">
                {SERVICES.map((s) => (
                    <button
                        key={s}
                        role="tab"
                        aria-selected={service === s}
                        onClick={() => setService(s)}
                        className={cn(
                            'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                            service === s ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {SERVICE_LABEL[s]}
                    </button>
                ))}
            </div>

            <OverviewCards service={service} />
            <TenantTable key={service} service={service} />
        </div>
    );
}
