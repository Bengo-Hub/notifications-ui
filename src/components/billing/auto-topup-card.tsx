'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui/base';
import type { CreditService, CreditSnapshot } from '@/lib/api/credits';
import { useSetAutoTopup } from '@/hooks/use-credits';

function kes(n: number) {
    return `KES ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/**
 * Auto top-up: buy a chosen bundle with the saved card when the bundle balance drops below a number
 * the tenant sets, up to a monthly limit. The server enforces every rule (one purchase a day, the
 * limit, switching off when a card is declined); this card only collects the choice.
 */
export function AutoTopupCard({ service, snap }: { service: CreditService; snap: CreditSnapshot }) {
    const current = snap.auto_topup;
    const save = useSetAutoTopup(service);
    const [threshold, setThreshold] = useState('');
    const [bundle, setBundle] = useState('');
    const [limit, setLimit] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!current) return;
        setThreshold(current.threshold > 0 ? String(current.threshold) : '');
        setBundle(current.bundle_code || snap.bundles[0]?.code || '');
        setLimit(current.monthly_limit_kes > 0 ? String(current.monthly_limit_kes) : '5000');
    }, [current, snap.bundles]);

    if (!current || snap.exempt) return null;

    const apply = async (enabled: boolean) => {
        setError('');
        try {
            await save.mutateAsync(
                enabled
                    ? { enabled: true, threshold: Number(threshold), bundle_code: bundle, monthly_limit_kes: Number(limit) || undefined }
                    : { enabled: false },
            );
        } catch (e: unknown) {
            const message = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(message || 'We could not save this. Try again.');
        }
    };

    const valid = Number(threshold) >= 1 && bundle !== '';

    return (
        <Card>
            <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold">Auto top-up</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Buy a bundle automatically with your saved card when your bundle units run low. At most one purchase a day, never above your monthly limit.
                        </p>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-3 py-1 border ${current.enabled ? 'border-green-500/30 text-green-600 bg-green-500/10' : 'border-border text-muted-foreground'}`}>
                        {current.enabled ? 'ON' : 'OFF'}
                    </span>
                </div>

                {!current.enabled && current.disabled_reason && current.disabled_reason !== 'turned off by the tenant' && (
                    <p className="text-sm rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
                        Switched off: {current.disabled_reason}. Check your card on the billing page, then switch it on again.
                    </p>
                )}

                <div className="grid sm:grid-cols-3 gap-4">
                    <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">Buy when units are below</span>
                        <input
                            type="number"
                            min={1}
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            className="w-full h-10 rounded-lg bg-card border border-border px-3 text-foreground"
                            placeholder="e.g. 50"
                        />
                    </label>
                    <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">Bundle to buy</span>
                        <select
                            value={bundle}
                            onChange={(e) => setBundle(e.target.value)}
                            className="w-full h-10 rounded-lg bg-card border border-border px-3 text-foreground"
                        >
                            {snap.bundles.map((b) => (
                                <option key={b.code} value={b.code}>
                                    {b.units.toLocaleString()} units, {kes(b.price_kes)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">Monthly limit (KES)</span>
                        <input
                            type="number"
                            min={1}
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                            className="w-full h-10 rounded-lg bg-card border border-border px-3 text-foreground"
                        />
                    </label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button disabled={!valid || save.isPending} onClick={() => apply(true)}>
                        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : current.enabled ? 'Save changes' : 'Switch on'}
                    </Button>
                    {current.enabled && (
                        <Button variant="outline" disabled={save.isPending} onClick={() => apply(false)}>
                            Switch off
                        </Button>
                    )}
                    {current.enabled && (
                        <span className="text-xs text-muted-foreground">
                            Spent this month: {kes(current.spent_kes)} of {kes(current.monthly_limit_kes)}
                        </span>
                    )}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
        </Card>
    );
}
