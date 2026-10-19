'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { Loader2 } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { creditsApi, type CreditService, type CreditSnapshot } from '@/lib/api/credits';
import { creditKeys, useCreditSnapshot, useCreditTransactions, useSetAutoRenew } from '@/hooks/use-credits';
import { useAuthStore } from '@/store/auth';

const REASON_TEXT: Record<string, string> = {
    no_subscription: 'Your account has no active subscription. Subscribe to a plan first.',
    service_not_activated: 'Not activated yet. Buy a bundle or plan below to start sending.',
};

const ACTION_LABEL: Record<string, string> = {
    topup: 'Bundle bought',
    grant: 'Granted',
    deduction: 'Sent',
    refund: 'Refunded',
    adjustment: 'Adjustment',
    overage: 'Sent beyond plan (KES 1 each)',
};

function kes(n: number) {
    return `KES ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function when(dateStr: string) {
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function statusBadge(s: CreditSnapshot) {
    if (s.exempt) return { text: 'INCLUDED', cls: 'border-blue-500/30 text-blue-600 bg-blue-500/10' };
    if (!s.covered) return { text: 'NOT ACTIVE', cls: 'border-orange-500/30 text-orange-600 bg-orange-500/10' };
    return { text: 'ACTIVE', cls: 'border-green-500/30 text-green-600 bg-green-500/10' };
}

interface PendingPurchase {
    intentId: string;
    initiateUrl: string;
    amount: number;
}

/**
 * One credit service (SMS or WhatsApp) for the acting tenant: balances, the recurring plan where
 * the service has one, bundles to buy, overage and recent activity. All numbers and prices come
 * from subscriptions-api; nothing is priced in this app.
 */
export function CreditServicePanel({ service }: { service: CreditService }) {
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const { data: snap, isLoading, isError, refetch } = useCreditSnapshot(service);
    const { data: ledger, isLoading: ledgerLoading } = useCreditTransactions(service, 10);
    const autoRenew = useSetAutoRenew(service);

    const [buying, setBuying] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [pending, setPending] = useState<PendingPurchase | null>(null);

    const buy = async (kind: 'bundle' | 'tier', code: string, amount: number) => {
        setError('');
        setBuying(`${kind}:${code}`);
        try {
            const result = await creditsApi.purchase(service, {
                kind,
                code,
                return_url: `${window.location.origin}/billing/${service === 'sms' ? 'credits' : 'whatsapp'}?status=success`,
            });
            if (result.initiate_url && result.intent_id) {
                setPending({ intentId: result.intent_id, initiateUrl: result.initiate_url, amount });
            } else if (result.authorization_url) {
                window.location.assign(result.authorization_url);
            }
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(message || 'We could not start the payment. Try again.');
        } finally {
            setBuying(null);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (isError || !snap) {
        return (
            <div className="p-6 text-sm">
                <span className="text-destructive">Could not load your {service === 'sms' ? 'SMS' : 'WhatsApp'} balance. </span>
                <button onClick={() => refetch()} className="font-medium text-primary hover:underline">Retry</button>
            </div>
        );
    }

    const badge = statusBadge(snap);
    const tiers = snap.tiers ?? [];
    const hasTiers = tiers.length > 0;
    const currentTier = tiers.find((t) => t.code === snap.tier_code);
    const overagePct = snap.overage_cap_kes > 0 ? Math.min(100, (snap.overage_pending_kes / snap.overage_cap_kes) * 100) : 0;

    return (
        <>
            {pending && (
                <TreasuryPaymentModal
                    open
                    onOpenChange={(open) => !open && setPending(null)}
                    paymentIntentId={pending.intentId}
                    tenantSlug={user?.tenantSlug ?? ''}
                    initiateUrl={pending.initiateUrl}
                    amount={pending.amount}
                    currency="KES"
                    referenceType="credit_purchase"
                    customerEmail={user?.email}
                    onPaymentConfirmed={() => {
                        setPending(null);
                        queryClient.invalidateQueries({ queryKey: creditKeys.all });
                    }}
                    onPaymentFailed={() => setPending(null)}
                />
            )}

            <div className="p-6 max-w-7xl mx-auto space-y-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{snap.label}</h1>
                        <p className="text-muted-foreground mt-1">
                            {service === 'sms'
                                ? 'Buy SMS bundles. Each SMS costs KES 1, and any you send beyond your bundles is added to your next invoice.'
                                : 'Choose a monthly plan and top up with bundles. Each message beyond your plan and bundles costs KES 1 and is added to your next invoice.'}
                        </p>
                    </div>
                    <Badge variant="outline" className={`rounded-full font-semibold px-3 py-1 text-[10px] ${badge.cls}`}>{badge.text}</Badge>
                </div>

                {!snap.covered && !snap.exempt && snap.reason && (
                    <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 text-sm">
                        {REASON_TEXT[snap.reason] ?? 'Sending is not available for this account.'}
                    </div>
                )}
                {snap.exempt && (
                    <div className="rounded-xl border border-border bg-accent/40 p-4 text-sm text-muted-foreground">
                        This account sends without limits and is never billed for {snap.label}.
                    </div>
                )}

                {!snap.exempt && (
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Bundle units left</p>
                                <span className={`text-4xl font-bold ${snap.bundle_balance <= 0 ? 'text-destructive' : ''}`}>
                                    {snap.bundle_balance.toLocaleString()}
                                </span>
                                <p className="text-xs text-muted-foreground mt-2">Bundle units never expire.</p>
                            </CardContent>
                        </Card>
                        {hasTiers && (
                            <Card>
                                <CardContent className="p-6">
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                                        {currentTier ? `${currentTier.name} plan messages left` : 'Plan messages left'}
                                    </p>
                                    <span className="text-4xl font-bold">
                                        {snap.unlimited ? 'Unlimited' : snap.quota_balance.toLocaleString()}
                                    </span>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {snap.tier_period_end
                                            ? `${currentTier ? 'Renews or ends' : 'Ended'} ${new Date(snap.tier_period_end).toLocaleDateString()}`
                                            : 'No plan yet'}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Owed for extra messages</p>
                                <span className="text-4xl font-bold">{kes(snap.overage_pending_kes)}</span>
                                <div className="h-2 rounded-full bg-accent mt-3 overflow-hidden">
                                    <div className={`h-full ${overagePct >= 80 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${overagePct}%` }} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Sending pauses at {kes(snap.overage_cap_kes)} until you pay or buy a bundle.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {!snap.exempt && hasTiers && (
                    <section>
                        <h2 className="text-xl font-bold mb-4">Monthly plans</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {tiers.map((t) => {
                                const current = snap.tier_code === t.code;
                                return (
                                    <Card key={t.code} className={current ? 'border-primary' : ''}>
                                        <CardContent className="p-6 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold">{t.name}</h3>
                                                {current && <Badge variant="outline" className="text-[10px]">CURRENT</Badge>}
                                            </div>
                                            <p className="text-3xl font-bold">{kes(t.price_kes)}<span className="text-sm font-medium text-muted-foreground"> / month</span></p>
                                            <p className="text-sm text-muted-foreground">
                                                {t.monthly_units < 0 ? 'Unlimited messages' : `${t.monthly_units.toLocaleString()} messages a month`}
                                            </p>
                                            <Button
                                                className="w-full"
                                                variant={current ? 'outline' : 'primary'}
                                                disabled={buying !== null}
                                                onClick={() => buy('tier', t.code, t.price_kes)}
                                            >
                                                {buying === `tier:${t.code}` ? <Loader2 className="h-4 w-4 animate-spin" /> : current ? 'Renew now' : 'Choose plan'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                        {currentTier && (
                            <label className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                                <input
                                    type="checkbox"
                                    checked={snap.auto_renew}
                                    disabled={autoRenew.isPending}
                                    onChange={(e) => autoRenew.mutate(e.target.checked)}
                                />
                                Add this plan to my subscription invoice each period
                            </label>
                        )}
                    </section>
                )}

                {!snap.exempt && (
                    <section>
                        <h2 className="text-xl font-bold mb-1">Buy a bundle</h2>
                        <p className="text-sm text-muted-foreground mb-4">Units are added as soon as the payment goes through.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {snap.bundles.map((b) => (
                                <Button
                                    key={b.code}
                                    variant="outline"
                                    className="h-auto py-4 flex-col"
                                    disabled={buying !== null}
                                    onClick={() => buy('bundle', b.code, b.price_kes)}
                                >
                                    {buying === `bundle:${b.code}` ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <span className="text-lg font-bold">{b.units.toLocaleString()}</span>
                                            <span className="text-xs text-muted-foreground">{kes(b.price_kes)}</span>
                                        </>
                                    )}
                                </Button>
                            ))}
                        </div>
                        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
                    </section>
                )}

                <section>
                    <h2 className="text-xl font-bold mb-4">Recent activity</h2>
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border bg-accent/30">
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">When</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Units</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledgerLoading ? (
                                        <tr><td colSpan={4} className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
                                    ) : (ledger?.data ?? []).length === 0 ? (
                                        <tr><td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</td></tr>
                                    ) : (
                                        ledger!.data.map((tx) => (
                                            <tr key={tx.id} className="border-b border-border">
                                                <td className="py-3 px-6 text-sm">{when(tx.created_at)}</td>
                                                <td className="py-3 px-6 text-sm text-muted-foreground">{tx.description || ACTION_LABEL[tx.action] || tx.action}</td>
                                                <td className={`py-3 px-6 text-sm text-right font-semibold ${tx.tokens >= 0 ? 'text-green-600' : 'text-foreground'}`}>
                                                    {tx.tokens > 0 ? '+' : ''}{tx.tokens.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-6 text-sm text-right text-muted-foreground">{tx.new_balance.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </section>
            </div>
        </>
    );
}
