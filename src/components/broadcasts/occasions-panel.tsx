'use client';

import { Badge, Button, Card, CardContent, CardHeader, Switch } from '@/components/ui/base';
import { Modal } from '@/components/ui/modal';
import { useDraftOccasion, useOccasions, useSaveOccasion } from '@/hooks/use-broadcasts';
import type { Channel, Occasion, OccasionSettings, OccasionVariant, SendScope } from '@/lib/api/broadcasts';
import { cn } from '@/lib/utils';
import { CalendarDays, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiError, CHANNEL_LABELS, day, inputCls } from './shared';

const OCCASION_CHANNELS: Channel[] = ['email', 'sms', 'whatsapp'];

/**
 * Yearly occasions (public holidays, Customer Service Week, the business's own dates). Each one
 * switched on gets a message prepared ahead of the day, from a wording that changes every year;
 * it waits for approval unless auto-send is on.
 */
export function OccasionsPanel({ scope, onOpenBroadcast }: { scope: SendScope; onOpenBroadcast: (id: string) => void }) {
    const { data: list = [], isLoading } = useOccasions();
    const save = useSaveOccasion();
    const draft = useDraftOccasion();
    const [editing, setEditing] = useState<Occasion | null>(null);

    const update = async (o: Occasion, patch: Partial<OccasionSettings>) => {
        try {
            await save.mutateAsync({ key: o.key, settings: { ...o.settings, ...patch } });
        } catch (err) {
            toast.error(apiError(err, 'Could not save'));
        }
    };

    const prepare = async (o: Occasion) => {
        try {
            const b = await draft.mutateAsync(o.key);
            toast.success(`${o.name}: message ready for review`);
            onOpenBroadcast(b.id);
        } catch (err) {
            toast.error(apiError(err, 'Could not prepare the message'));
        }
    };

    return (
        <Card>
            <CardHeader>
                <h2 className="font-bold flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Occasions</h2>
                <p className="text-xs text-muted-foreground mt-1">
                    Switch on the days you want to greet {scope === 'platform' ? 'tenants' : 'customers'} on. A message is prepared ahead of each one with a wording that changes every year,
                    and waits for approval unless you turn on auto-send.
                </p>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : (
                    <ul className="divide-y divide-border">
                        {list.map((o) => (
                            <li key={o.key} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold">{o.name}</span>
                                        {o.custom && <Badge variant="outline">Yours</Badge>}
                                        {o.needs_date && <Badge variant="warning">Date to confirm</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {o.next_date ? `Next: ${day(o.next_date)}` : 'No date set for the coming year'} ·{' '}
                                        {(o.settings.channels ?? []).map((c) => CHANNEL_LABELS[c]).join(', ') || 'No channel'} ·{' '}
                                        {o.settings.variants?.length ?? 0} wordings
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 text-xs"><Switch checked={o.settings.enabled} onCheckedChange={(v) => update(o, { enabled: v })} /> On</label>
                                    <label className="flex items-center gap-2 text-xs" title="Send without waiting for approval">
                                        <Switch checked={o.settings.auto_send} disabled={!o.settings.enabled} onCheckedChange={(v) => update(o, { auto_send: v })} /> Auto-send
                                    </label>
                                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(o)}><FileText className="h-3.5 w-3.5" /> Wording</Button>
                                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => prepare(o)} disabled={draft.isPending}>
                                        {draft.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Prepare this year&apos;s
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>

            <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `${editing.name}: wording` : ''}
                description="One wording is used each year, in turn, so people do not get last year's message again."
                className="max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
                {editing && <OccasionEditor scope={scope} occasion={editing} onDone={() => setEditing(null)} />}
            </Modal>
        </Card>
    );
}

function OccasionEditor({ scope, occasion, onDone }: { scope: SendScope; occasion: Occasion; onDone: () => void }) {
    const save = useSaveOccasion();
    const [variants, setVariants] = useState<OccasionVariant[]>(occasion.settings.variants?.length ? occasion.settings.variants : [{ subject: '', body: '', sms: '' }]);
    const [channels, setChannels] = useState<Channel[]>(occasion.settings.channels ?? ['email']);
    const [sendTime, setSendTime] = useState(occasion.settings.send_time || '09:00');

    const setVariant = (i: number, patch: Partial<OccasionVariant>) =>
        setVariants((prev) => prev.map((v, j) => (j === i ? { ...v, ...patch } : v)));

    const submit = async () => {
        try {
            await save.mutateAsync({ key: occasion.key, settings: { ...occasion.settings, channels, send_time: sendTime, variants: variants.filter((v) => v.body.trim()) } });
            toast.success('Saved');
            onDone();
        } catch (err) {
            toast.error(apiError(err, 'Could not save'));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Channels</label>
                    <div className="flex flex-wrap gap-2">
                        {OCCASION_CHANNELS.map((ch) => (
                            <button type="button" key={ch}
                                onClick={() => setChannels((p) => (p.includes(ch) ? p.filter((x) => x !== ch) : [...p, ch]))}
                                className={cn('rounded-full border px-3 py-1 text-xs font-medium', channels.includes(ch) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent')}>
                                {CHANNEL_LABELS[ch]}
                            </button>
                        ))}
                    </div>
                </div>
                <label className="space-y-1.5 text-xs font-semibold">
                    <span className="block">Send at</span>
                    <input type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)} className={inputCls} />
                </label>
            </div>
            {channels.includes('whatsapp') && (
                <p className="text-[11px] text-muted-foreground">
                    WhatsApp uses the approved template {occasion.settings.whatsapp_template || '(none for this occasion, so WhatsApp is skipped)'}; the wordings below are for email and SMS.
                </p>
            )}
            {variants.map((v, i) => (
                <fieldset key={i} className="space-y-2 rounded-lg border border-border p-4">
                    <legend className="px-1 text-xs font-semibold">Wording {i + 1}</legend>
                    <input value={v.subject} onChange={(e) => setVariant(i, { subject: e.target.value })} className={inputCls} placeholder="Email subject" />
                    <textarea rows={3} value={v.body} onChange={(e) => setVariant(i, { body: e.target.value })} className={inputCls} placeholder="Dear {first_name}, ..." />
                    <textarea rows={2} value={v.sms} onChange={(e) => setVariant(i, { sms: e.target.value })} className={inputCls} placeholder="Shorter SMS version (optional)" />
                    {variants.length > 1 && (
                        <button type="button" onClick={() => setVariants((p) => p.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs text-destructive">
                            <Trash2 className="h-3 w-3" /> Remove
                        </button>
                    )}
                </fieldset>
            ))}
            <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setVariants((p) => [...p, { subject: '', body: '', sms: '' }])}>
                    <Plus className="h-3.5 w-3.5" /> Add wording
                </Button>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
                    <Button type="button" onClick={submit} disabled={save.isPending} className="gap-2">
                        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                    </Button>
                </div>
            </div>
        </div>
    );
}
