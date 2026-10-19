'use client';

import { useState } from 'react';
import { Loader2, MessagesSquare, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useMessagingSettings, useSaveMessagingSettings } from '@/hooks/use-credits-admin';
import { apiErrorMessage, type AdminMessagingSettings } from '@/lib/api/credits-admin';
import { fmtDate, fmtKes } from './format';

/** Why a cap value cannot be saved, or an empty string when it can. Mirrors subscriptions-api. */
export function capError(raw: string, max: number): string {
    if (raw.trim() === '') return 'Enter an amount, or 0 for no cap.';
    const n = Number(raw);
    if (!Number.isFinite(n)) return 'Enter a number.';
    if (n < 0) return 'The cap cannot be negative.';
    if (n > max) return `The cap cannot be above ${fmtKes(max)}.`;
    if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return 'Use at most two decimal places.';
    return '';
}

function CapForm({ settings }: { settings: AdminMessagingSettings }) {
    const save = useSaveMessagingSettings();
    const [draft, setDraft] = useState<string | null>(null);
    const value = draft ?? String(settings.overage_cap_kes);
    const error = capError(value, settings.max_overage_cap_kes);
    const dirty = draft !== null && Number(draft) !== settings.overage_cap_kes;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (error || !dirty) return;
        try {
            await save.mutateAsync({ overage_cap_kes: Number(value) });
            setDraft(null);
            toast.success('Overage cap saved');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not save the overage cap.'));
        }
    };

    return (
        <form onSubmit={submit} className="space-y-3">
            <div>
                <label htmlFor="overage-cap" className="text-xs font-bold font-mono">messaging.overage_cap_kes</label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    The most unpaid overage a tenant can run up before SMS and WhatsApp sends pause. Each message past a
                    tenant&apos;s plan and bundles adds KES 1 to it, and paying the invoice or buying a bundle lets sending
                    continue.
                </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex-1 max-w-xs space-y-1">
                    <div className="flex items-center rounded-lg border border-border bg-accent/20 focus-within:ring-1 focus-within:ring-primary">
                        <span className="pl-3 text-xs text-muted-foreground">KES</span>
                        <input
                            id="overage-cap"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={settings.max_overage_cap_kes}
                            step="0.01"
                            value={value}
                            onChange={(e) => setDraft(e.target.value)}
                            aria-invalid={!!error}
                            className="w-full bg-transparent p-2 text-sm font-mono outline-none"
                        />
                    </div>
                    {error ? (
                        <p className="text-xs text-destructive">{error}</p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            0 means no cap. Default {fmtKes(settings.default_overage_cap_kes)}, highest {fmtKes(settings.max_overage_cap_kes)}.
                        </p>
                    )}
                </div>
                <Button type="submit" size="sm" variant="outline" className="shrink-0 gap-1.5" disabled={!dirty || !!error || save.isPending}>
                    {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
                {settings.updated_at ? `Last changed ${fmtDate(settings.updated_at)}.` : 'Using the default, never changed.'} A change reaches
                every server within a minute.
            </p>
        </form>
    );
}

export function MessagingSettingsCard() {
    const { data, isLoading, isError, refetch } = useMessagingSettings();
    return (
        <Card>
            <CardHeader className="border-b border-border/50 py-4">
                <div className="flex items-center gap-2">
                    <MessagesSquare className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-tight">Messaging</h3>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground">
                    SMS and WhatsApp prices, bundles and plans are set in subscriptions. This is the one messaging rule the platform
                    owner can change here.
                </p>
                {isLoading && (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-3 w-48 rounded bg-accent" />
                        <div className="h-9 w-64 rounded bg-accent" />
                    </div>
                )}
                {isError && (
                    <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm text-destructive">Could not load the messaging settings.</p>
                        <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                    </div>
                )}
                {data && <CapForm key={data.updated_at ?? 'default'} settings={data} />}
            </CardContent>
        </Card>
    );
}
