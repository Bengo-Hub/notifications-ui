'use client';

import { Badge, Button } from '@/components/ui/base';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { whatsappApi, type TemplateSyncResponse, type TemplateSyncResult } from '@/lib/api/whatsapp';
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, Send, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

/** Templates per request. Meta answers each create in a second or two, so a batch stays well
 *  inside the request timeout and one slow reply never loses the whole run. */
const BATCH_SIZE = 5;
/** A batch whose reply was lost is checked against Meta and tried again at most this often. */
const MAX_TRIES = 2;

type Row = { name: string; state: 'submitted' | 'failed' | 'waiting'; status?: string; detail?: string };

const STATE_META: Record<Row['state'], { className: string; icon: typeof CheckCircle2 }> = {
    submitted: { className: 'text-muted-foreground border-muted', icon: CheckCircle2 },
    failed: { className: 'text-destructive border-destructive/30 bg-destructive/5', icon: XCircle },
    waiting: { className: 'text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30', icon: Clock },
};

const STATUS_CLASS: Record<string, string> = {
    APPROVED: 'text-emerald-700 dark:text-emerald-300',
    PENDING: 'text-amber-700 dark:text-amber-300',
    IN_APPEAL: 'text-amber-700 dark:text-amber-300',
    REJECTED: 'text-destructive',
    PAUSED: 'text-destructive',
    DISABLED: 'text-destructive',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sync WhatsApp templates to Meta. Opens with a preview (dry run) of what is missing and the review
 * status of everything already on the WABA, then submits the missing ones in small batches, one
 * request after another. When a reply is lost (timeout or dropped connection) the batch is checked
 * against Meta rather than reported as failed, since the server finishes a batch it started. The
 * final list is read back from Meta, so the status shown is Meta's own.
 */
export function WhatsAppSyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    // The preview is Meta's live state: never cached between opens.
    const previewQuery = useQuery({
        queryKey: ['whatsapp-template-sync-preview'],
        queryFn: () => whatsappApi.syncTemplates({ dryRun: true }),
        enabled: open,
        staleTime: 0,
        gcTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const preview: TemplateSyncResponse | null = previewQuery.data ?? null;
    const loadingPreview = previewQuery.isFetching;
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [rows, setRows] = useState<Row[] | null>(null);
    const [runError, setRunError] = useState<string | null>(null);
    const previewError = previewQuery.error as any;
    const error = runError ?? (previewError
        ? previewError?.response?.data?.error ?? 'Could not reach Meta. Check the platform WhatsApp number has a WABA ID.'
        : null);
    const setError = setRunError;

    const loadPreview = () => {
        setRunError(null);
        void previewQuery.refetch();
    };

    // Closing clears the run, so the next open starts from a fresh preview.
    const close = () => {
        setRows(null);
        setProgress(null);
        setRunError(null);
        onClose();
    };

    const toCreate = preview?.results.filter((r) => r.outcome === 'created') ?? [];
    const onMeta = preview?.results.filter((r) => r.outcome === 'skipped') ?? [];
    const statusCounts = onMeta.reduce<Record<string, number>>((acc, r) => {
        const s = (r.meta_status || 'UNKNOWN').toUpperCase();
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
    }, {});
    const rejected = onMeta.filter((r) => (r.meta_status || '').toUpperCase() === 'REJECTED');

    const handleSubmit = async () => {
        const queue = toCreate.map((r) => r.name);
        const failed: Record<string, string> = {};
        const tries: Record<string, number> = {};
        let lostReplies = 0;
        let stopped: string | null = null;
        setSubmitting(true);
        setError(null);
        setProgress({ done: 0, total: queue.length });

        let pending = [...queue];
        while (pending.length > 0) {
            const batch = pending.slice(0, BATCH_SIZE);
            batch.forEach((n) => (tries[n] = (tries[n] ?? 0) + 1));
            let results: TemplateSyncResult[] | null = null;
            try {
                const res = await whatsappApi.syncTemplates({ dryRun: false, names: batch, batchSize: BATCH_SIZE });
                results = res.results;
            } catch (e: any) {
                if (e?.response) {
                    // The server answered with an error (credentials, Meta unreachable): stop here.
                    stopped = e.response.data?.error ?? `Meta sync stopped (status ${e.response.status})`;
                    break;
                }
                // No reply: the server keeps going with the batch. Give it a moment, then ask Meta.
                lostReplies++;
                await sleep(4000);
                try {
                    const check = await whatsappApi.syncTemplates({ dryRun: true, names: batch });
                    results = check.results.map((r) => (r.outcome === 'created' ? { ...r, outcome: 'queued' as const } : r));
                } catch {
                    results = null;
                }
            }
            const settled = new Set<string>();
            for (const r of results ?? []) {
                if (r.outcome === 'created' || r.outcome === 'skipped') settled.add(r.name);
                if (r.outcome === 'failed') {
                    failed[r.name] = r.detail || 'Refused by Meta';
                    settled.add(r.name);
                }
            }
            // Anything not settled goes round again, unless it has had its tries.
            pending = pending.filter((n) => !settled.has(n) && (!batch.includes(n) || tries[n] < MAX_TRIES));
            setProgress({ done: queue.length - pending.length, total: queue.length });
        }

        // Read the final state back from Meta so every status shown is Meta's own.
        let fresh: TemplateSyncResponse | null = null;
        try {
            fresh = await whatsappApi.syncTemplates({ dryRun: true, names: queue });
        } catch {
            fresh = null;
        }
        const byName = new Map((fresh?.results ?? []).map((r) => [r.name, r]));
        const out: Row[] = queue.map((name) => {
            const r = byName.get(name);
            if (r?.outcome === 'skipped') return { name, state: 'submitted', status: r.meta_status || 'PENDING' };
            if (failed[name]) return { name, state: 'failed', detail: failed[name] };
            return { name, state: 'waiting', detail: fresh ? 'Not on Meta yet. Run the sync again to submit it.' : 'Could not confirm with Meta. Refresh to check.' };
        });
        setRows(out);
        setSubmitting(false);
        if (stopped) setError(stopped);

        const ok = out.filter((r) => r.state === 'submitted').length;
        const bad = out.filter((r) => r.state === 'failed').length;
        const waiting = out.length - ok - bad;
        if (bad === 0 && waiting === 0) toast.success(`${ok} template(s) submitted for Meta review`);
        else toast.warning(`${ok} submitted, ${bad} refused by Meta, ${waiting} still to submit`);
        if (lostReplies > 0 && !stopped) {
            toast.info('Some replies were slow, so those batches were confirmed with Meta directly.');
        }
    };

    return (
        <Modal
            open={open}
            onClose={submitting ? () => undefined : close}
            title="Sync WhatsApp Templates to Meta"
            description="Only templates missing from the WABA are submitted, a few at a time. Nothing is sent until you confirm below."
            className="max-w-xl w-full shadow-xl max-h-[85vh] flex flex-col"
        >
            <div className="space-y-4 overflow-y-auto">
                {loadingPreview && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking what&apos;s already on Meta...
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {!loadingPreview && preview && !rows && (
                    <>
                        <p className="text-xs text-muted-foreground">
                            WABA <span className="font-mono">{preview.waba_id}</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border p-3">
                                <div className="text-2xl font-bold font-mono tabular-nums">{toCreate.length}</div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Would submit</div>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                                <div className="text-2xl font-bold font-mono tabular-nums text-muted-foreground">{onMeta.length}</div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Already on Meta</div>
                                {onMeta.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-x-2 text-[11px]">
                                        {Object.entries(statusCounts).map(([s, n]) => (
                                            <span key={s} className={cn('font-semibold', STATUS_CLASS[s] ?? 'text-muted-foreground')}>
                                                {n} {s.toLowerCase().replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {submitting && progress && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Submitting in batches of {BATCH_SIZE}</span>
                                    <span className="font-mono tabular-nums">{progress.done} / {progress.total}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-primary transition-all"
                                        style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                                </div>
                            </div>
                        )}

                        {toCreate.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Will be submitted for review</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {toCreate.map((r) => (
                                        <Badge key={r.name} variant="outline" className="font-mono text-[10px]">{r.name}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {rejected.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rejected by Meta</p>
                                {rejected.map((r) => (
                                    <div key={r.name} className="flex items-start gap-2 p-2 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
                                        <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                        <span className="font-mono">{r.name}</span>
                                        {r.meta_reason && <span className="opacity-80">{r.meta_reason.toLowerCase().replaceAll('_', ' ')}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {rows && (
                    <div className="space-y-1.5">
                        {rows.map((r) => {
                            const meta = STATE_META[r.state];
                            const Icon = meta.icon;
                            return (
                                <div key={r.name} className={cn('flex items-start gap-2 p-2.5 rounded-lg border text-xs', meta.className)}>
                                    <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="font-mono font-semibold">
                                            {r.name}
                                            {r.status && (
                                                <span className={cn('ml-2 rounded px-1.5 py-0.5 text-[10px] font-sans font-bold uppercase bg-black/5 dark:bg-white/10', STATUS_CLASS[r.status.toUpperCase()])}>
                                                    {r.status.toLowerCase().replace('_', ' ')}
                                                </span>
                                            )}
                                        </p>
                                        {r.detail && <p className="text-[11px] opacity-80 mt-0.5 break-words">{r.detail}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="pt-4 mt-2 border-t border-border/50 flex items-center justify-end gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => { setRows(null); loadPreview(); }} disabled={loadingPreview || submitting} className="gap-1.5 mr-auto">
                    <RefreshCw className={cn('h-3.5 w-3.5', loadingPreview && 'animate-spin')} /> Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={close} disabled={submitting}>
                    {rows ? 'Close' : 'Cancel'}
                </Button>
                {!rows && (
                    <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={submitting || loadingPreview || toCreate.length === 0}
                        onClick={handleSubmit}
                    >
                        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {submitting ? 'Submitting...' : `Submit ${toCreate.length} to Meta`}
                    </Button>
                )}
            </div>
        </Modal>
    );
}
