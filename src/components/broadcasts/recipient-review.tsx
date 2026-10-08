'use client';

import { Button } from '@/components/ui/base';
import { useAudienceReview, useEstimate, useSetExclusions } from '@/hooks/use-broadcasts';
import type { Broadcast, Channel, ReviewRow } from '@/lib/api/broadcasts';
import { cn } from '@/lib/utils';
import { AlertCircle, Loader2, Save, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiError, CHANNEL_LABELS, inputCls } from './shared';

/**
 * Who the message goes to, before it is approved: one row per person (a tenant, a customer or a
 * staff member) with a verified email or a valid phone, the masked address each channel would use or why it would not send, and a tick
 * box to leave people out. The counts and the list come from the same server-side review the
 * real send uses, so what is ticked here is exactly what goes out.
 */
export function RecipientReview({ broadcast, editable }: { broadcast: Broadcast; editable: boolean }) {
    const channels = broadcast.channels.filter((c) => c === 'email' || c === 'sms' || c === 'whatsapp') as Channel[];
    const estimate = useEstimate(broadcast.id, true);
    const review = useAudienceReview(broadcast.id, true);
    const save = useSetExclusions(broadcast.id);
    // Local changes against the saved state: key -> true (leave out) / false (put back).
    const [changes, setChanges] = useState<Record<string, boolean>>({});
    const [query, setQuery] = useState('');

    const rows: ReviewRow[] = useMemo(() => (review.data?.pages ?? []).flatMap((p) => p.data), [review.data]);
    const isOut = (r: ReviewRow) => (r.key in changes ? changes[r.key] : r.excluded);
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? rows.filter((r) => `${r.name} ${r.business_name ?? ''}`.toLowerCase().includes(q)) : rows;
    }, [rows, query]);
    const dirty = Object.keys(changes).length > 0;

    const toggle = (r: ReviewRow) => {
        if (!editable) return;
        setChanges((prev) => {
            const next = { ...prev };
            const target = !isOut(r);
            if (target === r.excluded) delete next[r.key];
            else next[r.key] = target;
            return next;
        });
    };
    const setAllVisible = (out: boolean) => {
        if (!editable) return;
        setChanges((prev) => {
            const next = { ...prev };
            for (const r of visible) {
                if (out === r.excluded) delete next[r.key];
                else next[r.key] = out;
            }
            return next;
        });
    };

    const submit = async () => {
        const exclude = Object.entries(changes).filter(([, v]) => v).map(([k]) => k);
        const include = Object.entries(changes).filter(([, v]) => !v).map(([k]) => k);
        try {
            const res = await save.mutateAsync({ exclude, include });
            setChanges({});
            toast.success(res.left_out === 0 ? 'Everyone in the list will get it' : `${res.left_out} left out`);
        } catch (err) {
            toast.error(apiError(err, 'Could not save the list'));
        }
    };

    const error = (review.error ?? estimate.error) as unknown;
    if (error) {
        return (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {apiError(error, 'Could not load the recipients')}
            </p>
        );
    }

    const e = estimate.data;
    return (
        <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Recipients</p>
                {e ? (
                    <p className="text-xs text-muted-foreground">
                        {e.at_least ? 'At least ' : ''}{e.people} in the audience
                        {channels.map((c) => ` · ${CHANNEL_LABELS[c]} ${e.reachable[c] ?? 0}`).join('')}
                        {e.left_out > 0 && ` · ${e.left_out} left out`}
                    </p>
                ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-48 flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Find by name"
                        className={cn(inputCls, 'pl-8')} />
                </div>
                {editable && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => setAllVisible(false)}>Tick all shown</Button>
                        <Button variant="outline" size="sm" onClick={() => setAllVisible(true)}>Untick all shown</Button>
                    </>
                )}
            </div>

            <div className="max-h-96 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                        <tr>
                            <th className="w-10 p-2.5"><span className="sr-only">Send</span></th>
                            <th className="p-2.5">Recipient</th>
                            {channels.map((c) => <th key={c} className="p-2.5">{CHANNEL_LABELS[c]}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {visible.map((r) => {
                            const out = isOut(r);
                            return (
                                <tr key={r.key} className={cn(out && 'opacity-50')}>
                                    <td className="p-2.5">
                                        <input type="checkbox" checked={!out} disabled={!editable} onChange={() => toggle(r)}
                                            aria-label={`Send to ${r.name}`} />
                                    </td>
                                    <td className="p-2.5">
                                        <span className="font-medium">{r.name || 'Unnamed'}</span>
                                        {r.business_name && r.business_name !== r.name && (
                                            <span className="block text-[11px] text-muted-foreground">{r.business_name}</span>
                                        )}
                                    </td>
                                    {channels.map((c) => {
                                        const rc = r.channels[c];
                                        return (
                                            <td key={c} className="p-2.5 align-top">
                                                {!rc && <span className="text-[11px] text-muted-foreground">Not used</span>}
                                                {rc?.address && <span className="font-mono text-xs">{rc.address}</span>}
                                                {rc && !rc.sends && !out && (
                                                    <span className="block text-[11px] text-muted-foreground">{rc.reason || 'not sent'}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        {visible.length === 0 && !review.isLoading && (
                            <tr><td colSpan={2 + channels.length} className="p-6 text-center text-sm text-muted-foreground">Nobody matches.</td></tr>
                        )}
                    </tbody>
                </table>
                {review.isLoading && <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                {review.hasNextPage ? (
                    <Button variant="outline" size="sm" onClick={() => review.fetchNextPage()} disabled={review.isFetchingNextPage}>
                        {review.isFetchingNextPage ? 'Loading…' : 'Load more'}
                    </Button>
                ) : <span className="text-[11px] text-muted-foreground">{rows.length} shown</span>}
                {editable && (
                    <Button size="sm" className="gap-1.5" onClick={submit} disabled={!dirty || save.isPending}>
                        {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save list
                    </Button>
                )}
            </div>
            <p className="text-[11px] text-muted-foreground">Addresses are partly hidden. Only people with a verified email or a valid phone are listed: email goes to those with a verified email, WhatsApp (or SMS when WhatsApp is off) to those with only a valid phone, and every channel when both are valid. People who opted out or gave no consent are never sent to, ticked or not.</p>
        </div>
    );
}
