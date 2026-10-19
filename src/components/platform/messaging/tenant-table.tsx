'use client';

import { useEffect, useState } from 'react';
import { Gift, Search } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import { useCreditsTenants } from '@/hooks/use-credits-admin';
import type { AdminCreditService, AdminTenantRow, AdminTenantStatus } from '@/lib/api/credits-admin';
import { cn } from '@/lib/utils';
import { GrantCreditsModal } from './grant-credits-modal';
import { capPercent, fmtDate, fmtKes, fmtUnits, SERVICE_LABEL, STATUS_BADGE, STATUS_LABEL } from './format';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: AdminTenantStatus | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'active', label: STATUS_LABEL.active },
    { value: 'capped', label: STATUS_LABEL.capped },
    { value: 'not_activated', label: STATUS_LABEL.not_activated },
    { value: 'exempt', label: STATUS_LABEL.exempt },
];

function useDebounced<T>(value: T, ms: number): T {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

function CapMeter({ row }: { row: AdminTenantRow }) {
    if (row.exempt) return <span className="text-xs text-muted-foreground">Never billed</span>;
    const pct = capPercent(row.overage_pending_kes, row.overage_cap_kes);
    const tone = row.capped ? 'bg-destructive' : pct >= 80 ? 'bg-yellow-500' : 'bg-primary';
    return (
        <div className="min-w-[8.5rem] space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                <span className={cn('font-medium', row.capped && 'text-destructive')}>{fmtKes(row.overage_pending_kes)}</span>
                <span className="text-muted-foreground">{row.overage_cap_kes > 0 ? `of ${fmtKes(row.overage_cap_kes)}` : 'no cap'}</span>
            </div>
            {row.overage_cap_kes > 0 && (
                <div
                    className="h-1.5 w-full rounded-full bg-accent overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    aria-label="Overage against the cap"
                >
                    <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
                </div>
            )}
        </div>
    );
}

function TierCell({ row }: { row: AdminTenantRow }) {
    if (!row.tier_code) return <span className="text-xs text-muted-foreground">No plan</span>;
    return (
        <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{row.tier_name || row.tier_code}</span>
                {!row.tier_active && <Badge variant="warning" className="text-[9px]">Lapsed</Badge>}
            </div>
            <p className="text-[11px] text-muted-foreground">
                {row.tier_active ? 'Renews' : 'Ended'} {fmtDate(row.tier_period_end, 'unknown')}
                {row.tier_active && !row.auto_renew ? ', auto renew off' : ''}
            </p>
        </div>
    );
}

export function TenantTable({ service }: { service: AdminCreditService }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<AdminTenantStatus | ''>('');
    const [page, setPage] = useState(1);
    const [grantFor, setGrantFor] = useState<AdminTenantRow | null>(null);
    const q = useDebounced(search.trim(), 300);

    // A new search or filter starts again from the first page. The page keys this table by
    // service, so switching service resets everything here.
    const changeSearch = (v: string) => {
        setSearch(v);
        setPage(1);
    };
    const changeStatus = (v: AdminTenantStatus | '') => {
        setStatus(v);
        setPage(1);
    };

    const { data, isLoading, isError, isFetching, refetch } = useCreditsTenants({
        service,
        q,
        status,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
    });

    const rows = data?.data ?? [];
    const total = data?.total ?? 0;
    const hasTiers = service === 'whatsapp';
    const hasOverage = service !== 'ai_credits';
    const filtered = q !== '' || status !== '';
    const label = SERVICE_LABEL[service];

    return (
        <>
            <div className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => changeSearch(e.target.value)}
                            placeholder="Search tenant name or slug"
                            aria-label="Search tenants"
                            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f.value || 'all'}
                                type="button"
                                onClick={() => changeStatus(f.value)}
                                className={cn(
                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    status === f.value
                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                        : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Card>
                    <div className={cn('overflow-x-auto transition-opacity', isFetching && !isLoading && 'opacity-70')}>
                        <table className="w-full min-w-[56rem] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <th className="px-4 py-3">Tenant</th>
                                    <th className="px-4 py-3">Plan</th>
                                    <th className="px-4 py-3 text-right">{service === 'ai_credits' ? 'Bundle' : 'Balance'}</th>
                                    {hasTiers && <th className="px-4 py-3">Tier and renewal</th>}
                                    {(hasTiers || service === 'ai_credits') && (
                                        <th className="px-4 py-3 text-right">{hasTiers ? 'Plan units left' : 'Allowance left'}</th>
                                    )}
                                    {hasOverage && <th className="px-4 py-3">Overage</th>}
                                    <th className="px-4 py-3 text-right">Used this month</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading &&
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-4" colSpan={9}>
                                                <div className="h-4 w-full rounded bg-accent" />
                                            </td>
                                        </tr>
                                    ))}
                                {rows.map((row) => (
                                    <tr key={row.tenant_id} className="hover:bg-accent/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{row.name}</p>
                                            <p className="font-mono text-[11px] text-muted-foreground">{row.slug}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.plan_name ? (
                                                <>
                                                    <p>{row.plan_name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{row.plan_status?.toLowerCase()}</p>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No subscription</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">{fmtUnits(row.bundle_balance)}</td>
                                        {hasTiers && (
                                            <td className="px-4 py-3">
                                                <TierCell row={row} />
                                            </td>
                                        )}
                                        {(hasTiers || service === 'ai_credits') && (
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {row.unlimited ? 'Unlimited' : fmtUnits(row.quota_balance)}
                                            </td>
                                        )}
                                        {hasOverage && (
                                            <td className="px-4 py-3">
                                                <CapMeter row={row} />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {fmtUnits(row.units_used_month)}
                                            <p className="text-[11px] text-muted-foreground">Last {fmtDate(row.last_activity_at)}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={STATUS_BADGE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 px-3 py-1.5 text-xs"
                                                disabled={row.exempt}
                                                title={row.exempt ? 'Exempt tenants are never billed' : undefined}
                                                onClick={() => setGrantFor(row)}
                                            >
                                                <Gift className="h-3.5 w-3.5" />
                                                Grant credits
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {isError && (
                        <div className="p-6 flex flex-wrap items-center justify-between gap-3 text-sm">
                            <span className="text-destructive">Could not load tenants.</span>
                            <button onClick={() => refetch()} className="font-medium text-primary hover:underline">Retry</button>
                        </div>
                    )}
                    {!isLoading && !isError && rows.length === 0 && (
                        <div className="p-10 text-center space-y-1">
                            <p className="text-sm font-medium">
                                {filtered ? `No ${label} tenants match.` : `No tenant has used ${label} yet.`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {filtered
                                    ? 'Try a different search or clear the status filter.'
                                    : 'Tenants appear here after their first bundle, plan or send.'}
                            </p>
                            {filtered && (
                                <button
                                    onClick={() => {
                                        changeSearch('');
                                        changeStatus('');
                                    }}
                                    className="pt-1 text-xs font-medium text-primary hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}
                </Card>

                <Pagination
                    page={page}
                    total={total}
                    limit={PAGE_SIZE}
                    hasMore={page * PAGE_SIZE < total}
                    onPageChange={setPage}
                />
            </div>

            <GrantCreditsModal tenant={grantFor} service={service} onClose={() => setGrantFor(null)} />
        </>
    );
}
