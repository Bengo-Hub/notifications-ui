'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { Loader2 } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import {
    creditsApi,
    WHATSAPP_CREDIT_SERVICES,
    type CreditSnapshot,
    type WhatsAppCategoryGuide,
    type WhatsAppCreditService,
} from '@/lib/api/credits';
import { creditKeys, useCredits, useCreditTransactions, useWhatsAppGuide } from '@/hooks/use-credits';
import { useAuthStore } from '@/store/auth';
import { AutoTopupCard } from '@/components/billing/auto-topup-card';

const REASON_TEXT: Record<string, string> = {
    no_subscription: 'Your account has no active subscription. Subscribe to a plan first.',
    service_not_activated: 'WhatsApp is not on yet. Buy credits for any kind of message below to turn it on.',
};

const ACTION_LABEL: Record<string, string> = {
    topup: 'Credits bought',
    grant: 'Granted',
    deduction: 'Sent',
    refund: 'Refunded',
    adjustment: 'Adjustment',
    overage: 'Sent beyond credits (on your next invoice)',
};

function kes(n: number) {
    return `KES ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function when(dateStr: string) {
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

interface PendingPurchase {
    intentId: string;
    initiateUrl: string;
    amount: number;
}

/** The plain name of a category; never Meta's category word on its own. */
function categoryName(snap: CreditSnapshot | undefined, guide: WhatsAppCategoryGuide | undefined) {
    return snap?.name || guide?.name || snap?.label || 'WhatsApp';
}

/**
 * WhatsApp credits, one wallet per kind of message. Each card says in plain words which of the
 * tenant's own messages use it, so the tenant knows which credits to buy. Prices, balances and
 * names come from subscriptions-api; the list of the tenant's messages comes from notifications-api.
 */
export function WhatsAppCreditsPanel() {
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const { data: all, isLoading, isError, refetch } = useCredits();
    const { data: guide } = useWhatsAppGuide();

    const [selected, setSelected] = useState<WhatsAppCreditService>('whatsapp_utility');
    const [buying, setBuying] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [pending, setPending] = useState<PendingPurchase | null>(null);
    const { data: ledger, isLoading: ledgerLoading } = useCreditTransactions(selected, 10);

    const snaps = WHATSAPP_CREDIT_SERVICES.map((s) => all?.find((x) => x.service === s)).filter(
        (s): s is CreditSnapshot => !!s,
    );
    const guideFor = (service: string) => guide?.find((g) => g.service === service);

    const buy = async (service: WhatsAppCreditService, code: string, amount: number) => {
        setError('');
        setBuying(`${service}:${code}`);
        try {
            const result = await creditsApi.purchase(service, {
                kind: 'bundle',
                code,
                return_url: `${window.location.origin}/billing/whatsapp?status=success`,
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
    if (isError || snaps.length === 0) {
        return (
            <div className="p-6 text-sm">
                <span className="text-destructive">Could not load your WhatsApp credits. </span>
                <button onClick={() => refetch()} className="font-medium text-primary hover:underline">Retry</button>
            </div>
        );
    }

    const first = snaps[0];
    const exempt = first.exempt;
    const legacyTier = snaps.find((s) => s.tier_code);
    const selectedSnap = snaps.find((s) => s.service === selected) ?? first;

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
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">WhatsApp credits</h1>
                    <p className="text-muted-foreground mt-1 max-w-3xl">
                        WhatsApp charges by the kind of message, so you buy credits for each kind separately. One credit
                        sends one message to one person, and a message only uses credits of its own kind. Test messages
                        from the Test button are free.
                    </p>
                </div>

                {!first.covered && !exempt && first.reason && (
                    <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 text-sm">
                        {REASON_TEXT[first.reason] ?? 'Sending is not available for this account.'}
                    </div>
                )}
                {exempt && (
                    <div className="rounded-xl border border-border bg-accent/40 p-4 text-sm text-muted-foreground">
                        This account sends WhatsApp messages without limits and is never billed for them.
                    </div>
                )}
                {legacyTier && !exempt && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                        Your {legacyTier.tier_name ?? 'monthly'} WhatsApp plan covers every kind of message
                        {legacyTier.tier_period_end ? ` until ${new Date(legacyTier.tier_period_end).toLocaleDateString()}` : ''}.
                        {' '}
                        {legacyTier.unlimited
                            ? 'Messages are unlimited until then.'
                            : `${legacyTier.quota_balance.toLocaleString()} plan messages are left.`}{' '}
                        Monthly plans are no longer sold and it will not renew. After it ends, messages use the credits below.
                    </div>
                )}

                {!exempt && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {snaps.map((snap) => {
                            const g = guideFor(snap.service);
                            const service = snap.service as WhatsAppCreditService;
                            const mine = g?.your_messages ?? [];
                            const isSelected = selected === service;
                            return (
                                <Card key={snap.service} className={isSelected ? 'border-primary' : ''}>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h2 className="text-lg font-bold">{categoryName(snap, g)}</h2>
                                                <p className="text-sm text-muted-foreground mt-1">{snap.explainer ?? g?.explainer}</p>
                                            </div>
                                            <Badge variant="outline" className="rounded-full text-[10px] whitespace-nowrap">
                                                {kes(snap.unit_price_kes)} / message
                                            </Badge>
                                        </div>

                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Credits left</p>
                                            <span className={`text-3xl font-bold ${snap.bundle_balance <= 0 ? 'text-destructive' : ''}`}>
                                                {snap.bundle_balance.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="text-sm">
                                            {mine.length > 0 ? (
                                                <>
                                                    <p className="font-medium">Your messages that use these credits</p>
                                                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                                                        {mine.slice(0, 5).map((m) => (
                                                            <li key={m.template_id} className="flex justify-between gap-3">
                                                                <span className="truncate">{m.label}</span>
                                                                <span className="whitespace-nowrap">{m.sent.toLocaleString()} sent</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <p className="text-xs text-muted-foreground mt-1">From the last 90 days.</p>
                                                </>
                                            ) : (
                                                <p className="text-muted-foreground">
                                                    You have not sent any of these lately.
                                                    {g?.examples?.length ? ` For example: ${g.examples.join(', ').toLowerCase()}.` : ''}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {snap.bundles.map((b) => (
                                                <Button
                                                    key={b.code}
                                                    variant="outline"
                                                    className="h-auto py-2 flex-col"
                                                    disabled={buying !== null}
                                                    onClick={() => buy(service, b.code, b.price_kes)}
                                                >
                                                    {buying === `${service}:${b.code}` ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <span className="font-bold">{b.units.toLocaleString()} credits</span>
                                                            <span className="text-xs text-muted-foreground">{kes(b.price_kes)}</span>
                                                        </>
                                                    )}
                                                </Button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setSelected(service)}
                                            className="text-sm font-medium text-primary hover:underline"
                                        >
                                            {isSelected ? 'Showing activity and auto top-up below' : 'Show activity and auto top-up'}
                                        </button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}

                {!exempt && <AutoTopupCard service={selected} snap={selectedSnap} />}

                <section>
                    <h2 className="text-xl font-bold mb-4">Recent activity: {categoryName(selectedSnap, guideFor(selected))}</h2>
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border bg-accent/30">
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">When</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Credits</th>
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
