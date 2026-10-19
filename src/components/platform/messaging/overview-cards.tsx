'use client';

import { Card, CardContent } from '@/components/ui/base';
import { useCreditsOverview } from '@/hooks/use-credits-admin';
import type { AdminCreditService } from '@/lib/api/credits-admin';
import { cn } from '@/lib/utils';
import { fmtKes, fmtUnits, SERVICE_LABEL } from './format';

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'danger' }) {
    return (
        <Card>
            <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className={cn('text-2xl font-bold tracking-tight tabular-nums', tone === 'danger' && 'text-destructive')}>{value}</p>
                {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
            </CardContent>
        </Card>
    );
}

function StatSkeleton() {
    return (
        <Card>
            <CardContent className="p-4 space-y-2 animate-pulse">
                <div className="h-3 w-24 rounded bg-accent" />
                <div className="h-7 w-20 rounded bg-accent" />
            </CardContent>
        </Card>
    );
}

export function OverviewCards({ service }: { service: AdminCreditService }) {
    const { data, isLoading, isError, refetch } = useCreditsOverview();
    const s = data?.services.find((x) => x.service === service);
    const month = data ? new Date(data.month_start).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

    if (isError) {
        return (
            <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-destructive">Could not load the {SERVICE_LABEL[service]} totals.</p>
                <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
            </div>
        );
    }
    if (isLoading || !s) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Stat label="Tenants activated" value={fmtUnits(s.tenants_activated)} />
            <Stat label="Units sold" value={fmtUnits(s.units_sold_month)} hint={`Paid bundles, ${month}`} />
            <Stat label="Units used" value={fmtUnits(s.units_consumed_month)} hint={month} />
            <Stat label="Bundle revenue" value={fmtKes(s.bundle_revenue_month_kes)} hint={month} />
            {s.allows_overage ? (
                <>
                    <Stat
                        label="Overage unpaid"
                        value={fmtKes(s.overage_outstanding_kes)}
                        hint={`${fmtKes(s.overage_accrued_month_kes)} accrued in ${month}`}
                    />
                    <Stat
                        label="At or over the cap"
                        value={fmtUnits(s.tenants_at_cap)}
                        hint={`Cap ${data && data.overage_cap_kes > 0 ? fmtKes(data.overage_cap_kes) : 'off'}`}
                        tone={s.tenants_at_cap > 0 ? 'danger' : undefined}
                    />
                </>
            ) : (
                <Stat label="Overage" value="Not offered" hint="Prepaid only, sends stop at zero" />
            )}
        </div>
    );
}
