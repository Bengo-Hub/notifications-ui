'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Receipt, RefreshCw } from 'lucide-react';
import { Badge, Card } from '@/components/ui/base';
import { useMe } from '@/hooks/useMe';
import { useWhatsAppCosts } from '@/hooks/use-whatsapp-costs';
import type { CostCategory, CostRow, CostWaba } from '@/lib/api/whatsapp-costs';
import { fmtKes, fmtUnits } from '@/components/platform/messaging/format';
import { cn } from '@/lib/utils';

// Plain names, matching the Messaging tab.
const CATEGORY_LABEL: Record<CostCategory, string> = {
    marketing: 'Promotions',
    utility: 'Order and account updates',
    authentication: 'Login codes',
    service: 'Replies',
    other: 'Other',
    legacy_allowance: 'Old plan allowance',
};

function isoDay(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function thisMonth(): { from: string; to: string } {
    const now = new Date();
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { from: isoDay(first), to: isoDay(now) };
}

function fmtMoney(n: number, currency?: string): string {
    const v = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency ? `${currency} ${v}` : v;
}

function tenantLabel(row: CostRow): string {
    if (row.tenant === 'platform') return 'Platform';
    if (row.tenant === 'unassigned') return 'Not linked to a tenant';
    return row.tenant;
}

function CategoryLines({ row }: { row: CostRow }) {
    const lines: string[] = [];
    for (const [cat, u] of Object.entries(row.meta)) {
        if (u && u.messages > 0) {
            lines.push(`Meta ${CATEGORY_LABEL[cat as CostCategory] ?? cat}: ${fmtUnits(u.messages)} for ${fmtMoney(u.cost, row.meta_currency)}`);
        }
    }
    for (const [cat, c] of Object.entries(row.credits)) {
        if (c && (c.consumed > 0 || c.kes_paid > 0)) {
            lines.push(`Credits ${CATEGORY_LABEL[cat as CostCategory] ?? cat}: ${fmtUnits(c.consumed)} used, ${fmtKes(c.kes_paid)} paid`);
        }
    }
    if (lines.length === 0) return null;
    return (
        <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            {lines.map((l) => (
                <li key={l}>{l}</li>
            ))}
        </ul>
    );
}

function RowCells({ row }: { row: CostRow }) {
    return (
        <tr className="align-top hover:bg-accent/5 transition-colors">
            <td className="px-4 py-3">
                <p className="font-medium">{tenantLabel(row)}</p>
                {row.note && <p className="text-[11px] text-muted-foreground">{row.note}</p>}
                <CategoryLines row={row} />
            </td>
            <td className="px-4 py-3">
                {row.whole_account ? (
                    <span className="text-xs font-medium">Whole account</span>
                ) : row.display_phone_number || row.phone_number_id ? (
                    <>
                        <p className="font-mono text-xs">{row.display_phone_number || row.phone_number_id}</p>
                        {row.verified_name && <p className="text-[11px] text-muted-foreground">{row.verified_name}</p>}
                    </>
                ) : (
                    <span className="text-xs text-muted-foreground">Platform number</span>
                )}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtUnits(row.meta_messages)}</td>
            <td className="px-4 py-3 text-right tabular-nums">
                {row.meta_currency ? fmtMoney(row.meta_cost, row.meta_currency) : '-'}
                {row.meta_currency && row.meta_currency !== 'KES' && (
                    <p className="text-[11px] text-muted-foreground">
                        {row.meta_cost_kes !== undefined ? fmtKes(row.meta_cost_kes) : 'rate unavailable'}
                    </p>
                )}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtUnits(row.credits_consumed)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtKes(row.kes_paid)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtKes(row.consumed_value_kes)}</td>
            <td className={cn('px-4 py-3 text-right tabular-nums', row.margin_kes !== undefined && row.margin_kes < 0 && 'text-destructive')}>
                {row.margin_kes !== undefined ? fmtKes(row.margin_kes) : <span className="text-xs text-muted-foreground">-</span>}
            </td>
        </tr>
    );
}

function WabaBlock({ waba }: { waba: CostWaba }) {
    return (
        <>
            <tr className="bg-accent/10">
                <td colSpan={8} className="px-4 py-2 text-xs">
                    <span className="font-semibold">Business account {waba.waba_id}</span>
                    <span className="text-muted-foreground">
                        {' '}
                        owned by {waba.owner === 'platform' ? 'the platform' : waba.owner || 'unknown'}
                        {waba.token_source === 'platform' ? ', read with the platform login' : ''}
                        {waba.currency ? `, Meta bills in ${waba.currency}` : ''}
                        {waba.currency && waba.currency !== 'KES' && waba.kes_per_unit
                            ? `, 1 ${waba.currency} = KES ${waba.kes_per_unit.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                            : ''}
                        {waba.rate_unavailable ? ', rate unavailable so no margin' : ''}
                    </span>
                    {waba.error && (
                        <p className="mt-1 flex items-start gap-1.5 text-destructive">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {waba.error}
                        </p>
                    )}
                </td>
            </tr>
            {waba.rows.map((row, i) => (
                <RowCells key={`${waba.waba_id}-${row.phone_number_id || row.display_phone_number || i}`} row={row} />
            ))}
        </>
    );
}

export default function WhatsAppCostsPage() {
    const { user } = useMe();
    // The signed claim only, as the API checks; the codevertex slug alone is not enough here.
    const isOwner = user?.isPlatformOwnerClaim === true;
    const initial = useMemo(thisMonth, []);
    const [from, setFrom] = useState(initial.from);
    const [to, setTo] = useState(initial.to);
    const rangeOk = !!from && !!to && from <= to;
    const { data, isLoading, isError, error, isFetching, refetch } = useWhatsAppCosts(from, to, isOwner && rangeOk);

    if (!isOwner) {
        return (
            <Card className="p-6 text-sm text-muted-foreground">
                Only platform owners can see WhatsApp costs, because the report shows every tenant&apos;s payments.
            </Card>
        );
    }

    const errMsg = (error as { response?: { data?: { error?: string } } } | null)?.response?.data?.error;
    const metaTotals = Object.entries(data?.totals.meta_cost ?? {});

    return (
        <div className="w-full space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Receipt className="h-6 w-6" />
                    WhatsApp costs
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    What Meta charged for each WhatsApp number we send from, next to what the tenant paid us in WhatsApp credits.
                    Meta bills in the business account&apos;s own currency and credits are in KES. Meta&apos;s cost is also shown in KES
                    at treasury&apos;s current rate, and the margin is worked out in KES. When no rate is available the margin is left out.
                </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs font-medium text-muted-foreground">
                    From
                    <input
                        type="date"
                        value={from}
                        max={to || undefined}
                        onChange={(e) => setFrom(e.target.value)}
                        className="mt-1 block rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                </label>
                <label className="text-xs font-medium text-muted-foreground">
                    To
                    <input
                        type="date"
                        value={to}
                        min={from || undefined}
                        onChange={(e) => setTo(e.target.value)}
                        className="mt-1 block rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                </label>
                <button
                    type="button"
                    onClick={() => {
                        const m = thisMonth();
                        setFrom(m.from);
                        setTo(m.to);
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-foreground/30"
                >
                    This month
                </button>
                <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={!rangeOk || isFetching}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-foreground/30 disabled:opacity-50"
                >
                    <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                    Reload
                </button>
                {data?.cached && <Badge variant="outline">Saved copy, up to an hour old</Badge>}
            </div>

            {!rangeOk && <p className="text-sm text-destructive">The end date must be on or after the start date.</p>}

            <p className="rounded-lg border border-border bg-accent/5 px-4 py-3 text-xs text-muted-foreground">
                Meta&apos;s figures are approximate and today&apos;s can still be filling in. Meta&apos;s invoice is the final word.
                Credits paid is what tenants paid for credits bought in these dates. Credits value is the credits they used, at
                today&apos;s price, plus any overage: compare that with Meta&apos;s cost.
            </p>

            {isError && (
                <Card className="p-4 text-sm text-destructive">{errMsg || 'The report could not be loaded. Try again.'}</Card>
            )}
            {data?.credits_error && (
                <Card className="p-4 text-sm text-destructive">{data.credits_error}</Card>
            )}

            <Card>
                <div className={cn('overflow-x-auto transition-opacity', isFetching && !isLoading && 'opacity-70')}>
                    <table className="w-full min-w-[64rem] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <th className="px-4 py-3">Tenant</th>
                                <th className="px-4 py-3">Number</th>
                                <th className="px-4 py-3 text-right">Meta messages</th>
                                <th className="px-4 py-3 text-right">Meta cost</th>
                                <th className="px-4 py-3 text-right">Credits used</th>
                                <th className="px-4 py-3 text-right">Credits paid</th>
                                <th className="px-4 py-3 text-right">Credits value</th>
                                <th className="px-4 py-3 text-right">Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading &&
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-4" colSpan={8}>
                                            <div className="h-4 w-full rounded bg-accent" />
                                        </td>
                                    </tr>
                                ))}
                            {data?.wabas.map((w) => <WabaBlock key={w.waba_id} waba={w} />)}
                            {data && data.tenants_on_platform_number.length > 0 && (
                                <>
                                    <tr className="bg-accent/10">
                                        <td colSpan={8} className="px-4 py-2 text-xs font-semibold">
                                            Tenants sending from the platform number
                                        </td>
                                    </tr>
                                    {data.tenants_on_platform_number.map((row) => (
                                        <RowCells key={`shared-${row.tenant_id}`} row={row} />
                                    ))}
                                </>
                            )}
                            {data && data.wabas.length === 0 && data.tenants_on_platform_number.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        No WhatsApp numbers are connected yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {data && (
                            <tfoot>
                                <tr className="border-t-2 border-border font-semibold">
                                    <td className="px-4 py-3" colSpan={2}>Total</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{fmtUnits(data.totals.meta_messages)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {metaTotals.length === 0 ? '-' : metaTotals.map(([c, v]) => <p key={c}>{fmtMoney(v, c)}</p>)}
                                        <p className="text-[11px] font-normal text-muted-foreground">
                                            {data.totals.meta_cost_kes !== undefined
                                                ? fmtKes(data.totals.meta_cost_kes)
                                                : data.totals.rate_unavailable
                                                  ? 'rate unavailable'
                                                  : 'not all accounts read'}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">{fmtUnits(data.totals.credits_consumed)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{fmtKes(data.totals.kes_paid)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{fmtKes(data.totals.consumed_value_kes)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {data.totals.margin_kes !== undefined ? fmtKes(data.totals.margin_kes) : '-'}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>
        </div>
    );
}
