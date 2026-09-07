'use client';

import { Badge, Button } from '@/components/ui/base';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { whatsappApi, type TemplateSyncResponse } from '@/lib/api/whatsapp';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Send, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const OUTCOME_META: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    created: { label: 'Would create', className: 'text-primary border-primary/30 bg-primary/5', icon: Send },
    skipped: { label: 'Already exists', className: 'text-muted-foreground border-muted', icon: CheckCircle2 },
    failed: { label: 'Rejected by Meta', className: 'text-destructive border-destructive/30 bg-destructive/5', icon: XCircle },
};

/**
 * Sync WhatsApp templates to Meta — idempotent by design (see internal/whatsapp/templatesync on
 * the backend): opens in preview mode (dry_run) showing exactly what would be created versus
 * what's already on the WABA, then a separate confirm step actually submits. Never silently
 * resubmits something already there.
 */
export function WhatsAppSyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [preview, setPreview] = useState<TemplateSyncResponse | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState<TemplateSyncResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setPreview(null);
            setSubmitted(null);
            setError(null);
            return;
        }
        loadPreview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const loadPreview = async () => {
        setLoadingPreview(true);
        setError(null);
        try {
            const res = await whatsappApi.syncTemplates({ dryRun: true });
            setPreview(res);
        } catch (e: any) {
            setError(e?.response?.data?.error ?? 'Failed to preview — check the platform WhatsApp number is configured with a WABA ID.');
        } finally {
            setLoadingPreview(false);
        }
    };

    const toCreate = preview?.results.filter((r) => r.outcome === 'created') ?? [];
    const alreadyExist = preview?.results.filter((r) => r.outcome === 'skipped') ?? [];

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const res = await whatsappApi.syncTemplates({ dryRun: false });
            setSubmitted(res);
            const failedCount = res.summary.failed ?? 0;
            if (failedCount > 0) {
                toast.error(`${failedCount} template(s) rejected by Meta — see details below`);
            } else {
                toast.success(`${res.summary.created ?? 0} template(s) submitted for Meta review`);
            }
        } catch (e: any) {
            setError(e?.response?.data?.error ?? 'Sync failed');
        } finally {
            setSubmitting(false);
        }
    };

    const results = submitted?.results ?? null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Sync WhatsApp Templates to Meta"
            description="Idempotent — only creates templates that don't already exist on the WABA. Nothing is sent until you confirm below."
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

                {!loadingPreview && preview && !results && (
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
                                <div className="text-2xl font-bold font-mono tabular-nums text-muted-foreground">{alreadyExist.length}</div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Already on Meta</div>
                            </div>
                        </div>

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
                    </>
                )}

                {results && (
                    <div className="space-y-1.5">
                        {results.map((r) => {
                            const meta = OUTCOME_META[r.outcome];
                            const Icon = meta.icon;
                            return (
                                <div key={r.name} className={cn('flex items-start gap-2 p-2.5 rounded-lg border text-xs', meta.className)}>
                                    <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="font-mono font-semibold">{r.name}</p>
                                        {r.detail && <p className="text-[11px] opacity-80 mt-0.5 break-words">{r.detail}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="pt-4 mt-2 border-t border-border/50 flex items-center justify-end gap-2 shrink-0">
                {!results && (
                    <Button variant="outline" size="sm" onClick={loadPreview} disabled={loadingPreview} className="gap-1.5 mr-auto">
                        <RefreshCw className={cn('h-3.5 w-3.5', loadingPreview && 'animate-spin')} /> Refresh
                    </Button>
                )}
                <Button variant="outline" size="sm" onClick={onClose}>
                    {results ? 'Close' : 'Cancel'}
                </Button>
                {!results && (
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
