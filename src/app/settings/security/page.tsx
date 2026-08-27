'use client';

import { Badge, Button, Card, CardContent, CardHeader, Switch } from '@/components/ui/base';
import { BackupDestinationForm } from '@/components/backup-destination-form';
import { Copy, DatabaseBackup, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { settingsApi, type EncryptionKeyStatus } from '@/lib/api/settings';
import { useBackupSettings, useUpdateBackupSettings } from '@/hooks/use-backup-settings';
import {
    useTenantBackupDestination,
    useTestTenantBackupDestination,
    useUpdateTenantBackupDestination,
} from '@/hooks/use-platform-config';
import type { UpsertBackupDestination } from '@/lib/api/platform-config';
import { useMe } from '@/hooks/useMe';
import { isPlatformOwnerOrSuperuser } from '@/lib/auth/permissions';

function formatHour(h: number): string {
    const period = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${period}`;
}

function AutoBackupCard() {
    const { data, isLoading } = useBackupSettings();
    const update = useUpdateBackupSettings();

    const [autoEnabled, setAutoEnabled] = useState(false);
    const [scheduleHour, setScheduleHour] = useState(2);
    const [retentionDays, setRetentionDays] = useState(4);

    useEffect(() => {
        if (data) {
            setAutoEnabled(data.auto_enabled);
            setScheduleHour(data.schedule_hour);
            setRetentionDays(data.retention_days);
        }
    }, [data]);

    const dirty =
        !!data &&
        (autoEnabled !== data.auto_enabled ||
            scheduleHour !== data.schedule_hour ||
            retentionDays !== data.retention_days);

    const handleSave = async () => {
        try {
            await update.mutateAsync({
                auto_enabled: autoEnabled,
                schedule_hour: scheduleHour,
                retention_days: retentionDays,
            });
            toast.success('Backup settings saved');
        } catch {
            toast.error('Failed to save backup settings');
        }
    };

    return (
        <Card>
            <CardHeader className="border-b border-border/50 py-4">
                <div className="flex items-center gap-2">
                    <DatabaseBackup className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-tight">Automatic Backups</h3>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1 pr-4">
                        <h4 className="text-sm font-bold">Enable automatic backups</h4>
                        <p className="text-xs text-muted-foreground">
                            Off by default. When enabled, a daily backup of this organization&apos;s data runs at the
                            scheduled hour. Older backups are pruned automatically.
                        </p>
                    </div>
                    <Switch
                        checked={autoEnabled}
                        onCheckedChange={setAutoEnabled}
                        disabled={isLoading || update.isPending}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Daily backup time
                        </label>
                        <select
                            value={scheduleHour}
                            onChange={(e) => setScheduleHour(Number(e.target.value))}
                            disabled={!autoEnabled || isLoading || update.isPending}
                            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {Array.from({ length: 24 }, (_, h) => (
                                <option key={h} value={h}>
                                    {formatHour(h)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Retention (days)
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={retentionDays}
                            onChange={(e) => setRetentionDays(Math.max(1, Number(e.target.value) || 1))}
                            disabled={!autoEnabled || isLoading || update.isPending}
                            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-border/50">
                    <Button
                        type="button"
                        size="sm"
                        className="px-6"
                        disabled={!dirty || update.isPending}
                        onClick={handleSave}
                    >
                        {update.isPending ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function TenantBackupDestinationCard() {
    const { data, isLoading } = useTenantBackupDestination();
    const update = useUpdateTenantBackupDestination();
    const test = useTestTenantBackupDestination();

    const handleSave = async (body: UpsertBackupDestination) => {
        try {
            await update.mutateAsync(body);
            toast.success('Backup destination saved');
        } catch (e: any) {
            toast.error(e?.response?.data?.error ?? 'Failed to save backup destination');
        }
    };

    return (
        <BackupDestinationForm
            title="Backup Destination Override"
            description="Optional. Overrides the platform default remote mirror destination for this organization's backups only."
            data={data}
            isLoading={isLoading}
            onSave={handleSave}
            saving={update.isPending}
            onTest={(body) => test.mutate(body)}
            testing={test.isPending}
            testResult={test.data}
        />
    );
}

function CredentialEncryptionKeyCard() {
    const [status, setStatus] = useState<EncryptionKeyStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [manualKey, setManualKey] = useState('');
    const [keyError, setKeyError] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const data = await settingsApi.getEncryptionKey();
            setStatus(data);
        } catch {
            setStatus(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await settingsApi.updateEncryptionKey({ generate: true });
            await fetchStatus();
            toast.success('New encryption key generated and activated');
        } catch {
            toast.error('Failed to generate encryption key');
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveManual = async () => {
        const key = manualKey.trim();
        if (!key) {
            setKeyError('Enter a base64-encoded 32-byte key');
            return;
        }
        setSaving(true);
        setKeyError(null);
        try {
            await settingsApi.updateEncryptionKey({ key });
            await fetchStatus();
            setManualKey('');
            setShowAdvanced(false);
            toast.success('Encryption key activated');
        } catch (err) {
            const data = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
            const msg = data?.error || data?.message || 'Invalid key — must be a base64-encoded 32-byte value';
            setKeyError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const badge = (() => {
        if (loading) return <Badge variant="outline">Loading…</Badge>;
        if (!status?.configured) {
            return <Badge variant="error">Not configured — provider credentials stored unencrypted</Badge>;
        }
        if (status.source === 'db') return <Badge variant="success">Configured (database)</Badge>;
        return <Badge variant="warning">Using environment fallback</Badge>;
    })();

    const busy = loading || generating || saving;

    return (
        <Card>
            <CardHeader className="border-b border-border/50 py-4">
                <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-tight">Credential Encryption Key</h3>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1 pr-4">
                        <h4 className="text-sm font-bold">Active key</h4>
                        <p className="text-xs text-muted-foreground">
                            Encrypts provider API keys and secrets at rest. Managed at the platform level.
                        </p>
                    </div>
                    {badge}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Key fingerprint
                        </label>
                        <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono truncate">
                            {loading ? '…' : status?.key_fingerprint || 'N/A'}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Last updated
                        </label>
                        <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono truncate">
                            {loading ? '…' : status?.updated_at ? new Date(status.updated_at).toLocaleString() : 'Never'}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
                    <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        disabled={busy}
                        onClick={handleGenerate}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                        {generating ? 'Generating…' : 'Generate & activate new key'}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => { setShowAdvanced((v) => !v); setKeyError(null); }}
                    >
                        {showAdvanced ? 'Hide advanced' : 'Advanced'}
                    </Button>
                </div>

                {showAdvanced && (
                    <div className="space-y-2 p-4 rounded-xl bg-accent/10 border border-border/50">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Provide your own key (base64-encoded 32 bytes)
                        </label>
                        <input
                            type="text"
                            value={manualKey}
                            onChange={(e) => { setManualKey(e.target.value); setKeyError(null); }}
                            placeholder="base64 32-byte key"
                            spellCheck={false}
                            autoComplete="off"
                            disabled={saving}
                            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        {keyError && <p className="text-xs text-destructive">{keyError}</p>}
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                size="sm"
                                className="px-6"
                                disabled={saving || !manualKey.trim()}
                                onClick={handleSaveManual}
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        New credentials encrypt with the active key; existing ones stay readable (decryption tries
                        previous keys / plaintext). The raw key is never shown.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function SecuritySettingsPage() {
    const { user } = useMe();
    const isPlatformAdmin = isPlatformOwnerOrSuperuser(user ?? null);

    const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

    useEffect(() => {
        settingsApi.getSecuritySettings()
            .then(data => setWebhookSecret(data.webhook_secret))
            .catch(() => { /* silent — not configured */ });
    }, []);

    const handleCopyWebhookSecret = async () => {
        const value = webhookSecret ?? 'Not configured';
        try {
            await navigator.clipboard.writeText(value);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Failed to copy');
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="border-b border-border/50 py-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">Security Policies</h3>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold">Webhook signing secret</h4>
                        <p className="text-xs text-muted-foreground">Use this secret to verify webhook payloads. Keep it confidential.</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono flex items-center gap-2">
                                <span className="truncate">{webhookSecret ? '••••••••••••••••••••' : 'Not available (configure at platform level)'}</span>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleCopyWebhookSecret}>
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold">Encrypted Storage</h4>
                            <p className="text-xs text-muted-foreground">Automatically encrypt all provider API keys and secrets in the database.</p>
                        </div>
                        <Badge variant="default">Always On</Badge>
                    </div>
                </CardContent>
            </Card>

            <AutoBackupCard />

            <TenantBackupDestinationCard />

            {isPlatformAdmin && <CredentialEncryptionKeyCard />}
        </div>
    );
}
