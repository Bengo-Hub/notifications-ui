'use client';

import { Badge, Button } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import { useBroadcast, useBroadcastAction, useEstimate, useRecipients } from '@/hooks/use-broadcasts';
import type { BroadcastAction, Channel, SendScope } from '@/lib/api/broadcasts';
import { Ban, CheckCircle2, Loader2, Pause, Pencil, Play, Send, Users, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiError, CHANNEL_LABELS, inputCls, RECIPIENT_STATUS, STATUS_LABELS, when } from './shared';

const PAGE = 25;

interface Props {
    scope: SendScope;
    id: string;
    canApprove: boolean;
    onEdit: () => void;
}

/** One broadcast: what it says, where it stands, who got it. */
export function BroadcastDetail({ scope, id, canApprove, onEdit }: Props) {
    const { data, isLoading } = useBroadcast(scope, id);
    const act = useBroadcastAction(scope);
    const estimate = useEstimate(scope);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [channelFilter, setChannelFilter] = useState('');
    const recipients = useRecipients(scope, id, { status: statusFilter || undefined, channel: channelFilter || undefined, limit: PAGE, offset: (page - 1) * PAGE });

    if (isLoading || !data) {
        return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
    }
    const b = data.broadcast;
    const s = STATUS_LABELS[b.status];

    const run = async (action: BroadcastAction, confirmText?: string) => {
        if (confirmText && !window.confirm(confirmText)) return;
        let note: string | undefined;
        if (action === 'reject') {
            note = window.prompt('Why is it rejected? (shown to whoever wrote it)') ?? undefined;
            if (note === undefined) return;
        }
        try {
            await act.mutateAsync({ id: b.id, action, note });
            toast.success({ submit: 'Sent for approval', approve: 'Approved: it will go out as scheduled', reject: 'Rejected', pause: 'Paused', resume: 'Resumed', cancel: 'Cancelled' }[action]);
        } catch (err) {
            toast.error(apiError(err, 'That did not work'));
        }
    };

    const runEstimate = async () => {
        try {
            const e = await estimate.mutateAsync(b.id);
            const parts = b.channels.filter((c) => c in e.reachable).map((c) => `${CHANNEL_LABELS[c as Channel]}: ${e.reachable[c]}`);
            toast.success(`${e.at_least ? 'At least ' : ''}${e.people} recipients. ${parts.join(', ')}. Opt-outs are removed when it sends.`);
        } catch (err) {
            toast.error(apiError(err, 'Could not count the audience'));
        }
    };

    const editable = b.status === 'draft' || b.status === 'pending_approval' || b.status === 'rejected';
    const handled = b.sent_count + b.failed_count + b.skipped_count + b.suppressed_count;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={s.variant}>{s.label}</Badge>
                {b.channels.map((c) => <Badge key={c} variant="outline">{CHANNEL_LABELS[c]}</Badge>)}
                <span className="text-xs text-muted-foreground">Sends {when(b.send_at)}</span>
            </div>
            {typeof b.metadata?.rejection_note === 'string' && b.status === 'rejected' && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">Rejected: {b.metadata.rejection_note as string}</p>
            )}

            {b.content.email && (
                <div className="rounded-lg border border-border p-4 text-sm space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</p>
                    <p className="font-semibold">{b.content.email.subject}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{b.content.email.body}</p>
                </div>
            )}
            {b.content.sms && (
                <div className="rounded-lg border border-border p-4 text-sm space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">SMS</p>
                    <p className="whitespace-pre-wrap">{b.content.sms.body}</p>
                </div>
            )}
            {b.content.whatsapp && (
                <div className="rounded-lg border border-border p-4 text-sm space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">WhatsApp template</p>
                    <p>{b.content.whatsapp.template} <span className="text-muted-foreground">({b.content.whatsapp.params.join(', ')})</span></p>
                    {b.content.whatsapp.message && <p className="whitespace-pre-wrap text-muted-foreground">{b.content.whatsapp.message}</p>}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {editable && <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>}
                {editable && b.audience?.type && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={runEstimate} disabled={estimate.isPending}>
                        {estimate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />} Count recipients
                    </Button>
                )}
                {(b.status === 'draft' || b.status === 'rejected') && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => run('submit')}><Send className="h-3.5 w-3.5" /> Send for approval</Button>
                )}
                {canApprove && (b.status === 'pending_approval' || b.status === 'draft') && (
                    <>
                        <Button size="sm" className="gap-1.5" onClick={() => run('approve', 'Approve and send? It goes out at the scheduled time to everyone in the audience.')}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                        {b.status === 'pending_approval' && (
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => run('reject')}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                        )}
                    </>
                )}
                {(b.status === 'scheduled' || b.status === 'sending') && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => run('pause')}><Pause className="h-3.5 w-3.5" /> Pause</Button>
                )}
                {b.status === 'paused' && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => run('resume')}><Play className="h-3.5 w-3.5" /> Resume</Button>}
                {['draft', 'pending_approval', 'scheduled', 'sending', 'paused'].includes(b.status) && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => run('cancel', 'Cancel it? Anything not sent yet stays unsent.')}>
                        <Ban className="h-3.5 w-3.5" /> Cancel
                    </Button>
                )}
            </div>

            {b.target_count > 0 && (
                <div className="space-y-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
                        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, b.progress)}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                        {[
                            ['Recipients', b.target_count], ['Sent', b.sent_count], ['Failed', b.failed_count],
                            ['Not sent', b.skipped_count], ['Opted out', b.suppressed_count],
                        ].map(([label, n]) => (
                            <div key={label as string} className="rounded-lg border border-border p-3">
                                <p className="text-[11px] text-muted-foreground">{label}</p>
                                <p className="text-lg font-semibold">{n as number}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{handled} of {b.target_count} handled.</p>
                    {Object.keys(data.channels ?? {}).length > 0 && (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {Object.entries(data.channels).map(([ch, counts]) => (
                                <span key={ch}>
                                    {CHANNEL_LABELS[ch as Channel] ?? ch}: {Object.entries(counts).map(([st, n]) => `${RECIPIENT_STATUS[st] ?? st} ${n}`).join(', ')}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {b.target_count > 0 && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <select value={channelFilter} onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }} className={`${inputCls} w-auto`}>
                            <option value="">All channels</option>
                            {b.channels.filter((c) => c !== 'in_app').map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
                        </select>
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${inputCls} w-auto`}>
                            <option value="">All statuses</option>
                            {Object.entries(RECIPIENT_STATUS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                        </select>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-accent/30 text-left text-xs text-muted-foreground">
                                <tr><th className="p-2.5">Recipient</th><th className="p-2.5">Channel</th><th className="p-2.5">Address</th><th className="p-2.5">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {(recipients.data?.data ?? []).map((r) => (
                                    <tr key={r.id}>
                                        <td className="p-2.5">{r.display_name || 'Unnamed'}</td>
                                        <td className="p-2.5">{CHANNEL_LABELS[r.channel as Channel] ?? r.channel}</td>
                                        <td className="p-2.5 font-mono text-xs">{r.address || '-'}</td>
                                        <td className="p-2.5">
                                            {RECIPIENT_STATUS[r.status] ?? r.status}
                                            {r.error && <span className="block text-[11px] text-muted-foreground">{r.error}</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={page} total={recipients.data?.total ?? 0} limit={PAGE}
                        hasMore={page * PAGE < (recipients.data?.total ?? 0)} onPageChange={setPage} variant="compact" />
                </div>
            )}
        </div>
    );
}
