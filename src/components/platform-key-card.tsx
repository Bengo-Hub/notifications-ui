'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

/** What every platform key endpoint returns: never key material, only a fingerprint. */
export interface PlatformKeyStatus {
    configured: boolean;
    source: 'db' | 'env' | '';
    key_fingerprint: string;
    updated_at: string | null;
}

interface ManualKeyOptions {
    save: (key: string) => Promise<unknown>;
    label: string;
    placeholder: string;
    savedToast: string;
    invalidFallback: string;
}

interface PlatformKeyCardProps<T extends PlatformKeyStatus> {
    title: string;
    /** One sentence under "Active key" saying what the key protects. */
    description: string;
    notConfiguredLabel: string;
    generateLabel: string;
    generatedToast: string;
    failedToast: string;
    footnote: string;
    load: () => Promise<T>;
    generate: () => Promise<unknown>;
    /** Present only for keys an operator may supply by hand (the encryption key). */
    manual?: ManualKeyOptions;
    /** Extra read-only rows under the fingerprint, given the loaded status. */
    extra?: (status: T) => ReactNode;
}

function errorText(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
    return data?.error || data?.message || fallback;
}

/**
 * One card for every platform-owner managed secret key (credential encryption key, mail delivery
 * webhook key): status badge, fingerprint, last change, generate-and-activate, and an optional
 * hand-supplied key. The raw key is never shown.
 */
export function PlatformKeyCard<T extends PlatformKeyStatus>(props: PlatformKeyCardProps<T>) {
    const { load, generate, manual } = props;
    const queryClient = useQueryClient();
    const queryKey = ['platform-key', props.title];
    const { data, isLoading: loading } = useQuery<T>({ queryKey, queryFn: load, retry: false });
    const status = data ?? null;
    const fetchStatus = () => queryClient.invalidateQueries({ queryKey });
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [manualKey, setManualKey] = useState('');
    const [keyError, setKeyError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await generate();
            await fetchStatus();
            toast.success(props.generatedToast);
        } catch (err) {
            toast.error(errorText(err, props.failedToast));
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveManual = async () => {
        if (!manual) return;
        const key = manualKey.trim();
        if (!key) {
            setKeyError(manual.placeholder);
            return;
        }
        setSaving(true);
        setKeyError(null);
        try {
            await manual.save(key);
            await fetchStatus();
            setManualKey('');
            setShowAdvanced(false);
            toast.success(manual.savedToast);
        } catch (err) {
            const msg = errorText(err, manual.invalidFallback);
            setKeyError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const badge = (() => {
        if (loading) return <Badge variant="outline">Loading…</Badge>;
        if (!status?.configured) return <Badge variant="error">{props.notConfiguredLabel}</Badge>;
        if (status.source === 'env') return <Badge variant="warning">Using environment fallback</Badge>;
        return <Badge variant="success">Configured (database)</Badge>;
    })();

    const busy = loading || generating || saving;

    return (
        <Card>
            <CardHeader className="border-b border-border/50 py-4">
                <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-tight">{props.title}</h3>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1 pr-4">
                        <h4 className="text-sm font-bold">Active key</h4>
                        <p className="text-xs text-muted-foreground">{props.description}</p>
                    </div>
                    {badge}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key fingerprint</label>
                        <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono truncate">
                            {loading ? '…' : status?.key_fingerprint || 'N/A'}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last updated</label>
                        <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono truncate">
                            {loading ? '…' : status?.updated_at ? new Date(status.updated_at).toLocaleString() : 'Never'}
                        </div>
                    </div>
                </div>

                {status && props.extra?.(status)}

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
                    <Button type="button" size="sm" className="gap-1.5" disabled={busy} onClick={handleGenerate}>
                        <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                        {generating ? 'Working…' : props.generateLabel}
                    </Button>
                    {manual && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                                setShowAdvanced((v) => !v);
                                setKeyError(null);
                            }}
                        >
                            {showAdvanced ? 'Hide advanced' : 'Advanced'}
                        </Button>
                    )}
                </div>

                {manual && showAdvanced && (
                    <div className="space-y-2 p-4 rounded-xl bg-accent/10 border border-border/50">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{manual.label}</label>
                        <input
                            type="text"
                            value={manualKey}
                            onChange={(e) => {
                                setManualKey(e.target.value);
                                setKeyError(null);
                            }}
                            placeholder={manual.placeholder}
                            spellCheck={false}
                            autoComplete="off"
                            disabled={saving}
                            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        {keyError && <p className="text-xs text-destructive">{keyError}</p>}
                        <div className="flex justify-end">
                            <Button type="button" size="sm" className="px-6" disabled={saving || !manualKey.trim()} onClick={handleSaveManual}>
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{props.footnote}</p>
                </div>
            </CardContent>
        </Card>
    );
}
