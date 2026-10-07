'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { useBroadcast, useBroadcasts, useDeleteBroadcast } from '@/hooks/use-broadcasts';
import type { Broadcast, SendScope } from '@/lib/api/broadcasts';
import { cn } from '@/lib/utils';
import { CalendarDays, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { BroadcastComposer } from './broadcast-composer';
import { BroadcastDetail } from './broadcast-detail';
import { apiError, CHANNEL_LABELS, STATUS_LABELS, when } from './shared';

const FILTERS = [
    { key: '', label: 'All' },
    { key: 'pending_approval', label: 'Awaiting approval' },
    { key: 'scheduled,sending,paused', label: 'Going out' },
    { key: 'completed', label: 'Sent' },
    { key: 'draft,rejected', label: 'Drafts' },
];
const PAGE = 20;

/** The sender's broadcasts, newest first, with the composer and the detail view. */
export function BroadcastList({ scope, canApprove, openId, onOpen }: { scope: SendScope; canApprove: boolean; openId: string | null; onOpen: (id: string | null) => void }) {
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);
    const { data, isLoading } = useBroadcasts(scope, { status: filter || undefined, limit: PAGE, offset: (page - 1) * PAGE });
    const del = useDeleteBroadcast(scope);
    const [composing, setComposing] = useState<'new' | string | null>(null);
    const editing = useBroadcast(scope, composing && composing !== 'new' ? composing : null);

    const remove = async (b: Broadcast) => {
        if (!window.confirm(`Delete the draft "${b.title}"?`)) return;
        try {
            await del.mutateAsync(b.id);
            toast.success('Draft deleted');
        } catch (err) {
            toast.error(apiError(err, 'Could not delete it'));
        }
    };

    const list = data?.data ?? [];
    const editingBroadcast = composing && composing !== 'new' ? editing.data?.broadcast : undefined;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="font-bold flex items-center gap-2"><Send className="h-4 w-4" /> Messages</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        {scope === 'platform'
                            ? 'Notices, greetings and offers to every tenant, by email, SMS, WhatsApp or dashboard banner.'
                            : 'Greetings, offers and notices to your customers or staff. Each one is approved before it goes out.'}
                    </p>
                </div>
                <Button onClick={() => setComposing('new')} className="gap-2 shrink-0"><Plus className="h-4 w-4" /> New message</Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
                            className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                filter === f.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent')}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : list.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {list.map((b) => {
                            const s = STATUS_LABELS[b.status];
                            return (
                                <li key={b.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <button className="min-w-0 space-y-1 text-left" onClick={() => onOpen(b.id)}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold hover:underline">{b.title}</span>
                                            <Badge variant={s.variant}>{s.label}</Badge>
                                            {b.occasion_id && <Badge variant="outline" className="gap-1"><CalendarDays className="inline h-3 w-3" /> Occasion</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {b.channels.map((c) => CHANNEL_LABELS[c]).join(', ')} · {when(b.send_at)}
                                            {b.target_count > 0 && ` · ${b.sent_count} of ${b.target_count} sent`}
                                        </p>
                                        {b.status === 'sending' && (
                                            <div className="h-1.5 w-56 max-w-full overflow-hidden rounded-full bg-accent">
                                                <div className="h-full bg-primary" style={{ width: `${Math.min(100, b.progress)}%` }} />
                                            </div>
                                        )}
                                    </button>
                                    {(b.status === 'draft' || b.status === 'rejected') && (
                                        <Button variant="outline" size="sm" className="gap-1.5 text-destructive shrink-0" onClick={() => remove(b)} disabled={del.isPending}>
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                {(data?.total ?? 0) > PAGE && (
                    <Pagination page={page} total={data?.total ?? 0} limit={PAGE} hasMore={page * PAGE < (data?.total ?? 0)} onPageChange={setPage} />
                )}
            </CardContent>

            <Modal open={openId !== null} onClose={() => onOpen(null)} title={list.find((b) => b.id === openId)?.title ?? 'Message'}
                className="max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
                {openId && (
                    <BroadcastDetail scope={scope} id={openId} canApprove={canApprove}
                        onEdit={() => { setComposing(openId); onOpen(null); }} />
                )}
            </Modal>

            <Modal open={composing !== null} onClose={() => setComposing(null)} title={composing === 'new' ? 'New message' : 'Edit message'}
                description="Nothing is sent until it is approved."
                className="max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
                {composing === 'new' && <BroadcastComposer scope={scope} onDone={(saved) => { setComposing(null); if (saved) onOpen(saved.id); }} />}
                {composing && composing !== 'new' && (editingBroadcast
                    ? <BroadcastComposer scope={scope} initial={editingBroadcast} onDone={(saved) => { setComposing(null); if (saved) onOpen(saved.id); }} />
                    : <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>)}
            </Modal>
        </Card>
    );
}
