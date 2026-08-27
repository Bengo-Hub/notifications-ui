'use client';

import { BackupDestinationForm } from '@/components/backup-destination-form';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import {
    usePlatformBackupDestination,
    usePlatformBilling,
    usePlatformSettings,
    useTestPlatformBackupDestination,
    useUpdatePlatformBackupDestination,
    useUpdatePlatformBilling,
    useUpsertPlatformSetting,
} from '@/hooks/use-platform-config';
import type { UpsertBackupDestination } from '@/lib/api/platform-config';
import { CreditCard, KeyRound, Loader2, Lock, Save, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function ServiceConfigEditor() {
    const { data: settings = [], isLoading, isError, refetch } = usePlatformSettings();
    const upsert = useUpsertPlatformSetting();
    const [drafts, setDrafts] = useState<Record<string, string>>({});

    const handleSave = async (key: string) => {
        const value = drafts[key];
        if (value === undefined) return;
        try {
            await upsert.mutateAsync({ key, body: { config_value: value } });
            toast.success(`${key} updated`);
            setDrafts((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        } catch (e: any) {
            toast.error(e?.response?.data?.error ?? 'Failed to update setting');
        }
    };

    return (
        <Card>
            <CardHeader className="border-b border-border/50 py-4">
                <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-tight">Service Configuration</h3>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground">
                    Platform-wide default values. Tenants may override individual keys from their own config.
                </p>
                {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
                    </div>
                )}
                {isError && (
                    <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                        <p className="text-sm text-destructive">Failed to load platform settings.</p>
                        <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                    </div>
                )}
                {!isLoading && !isError && settings.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No platform config keys defined yet.</p>
                )}
                {!isLoading && settings.length > 0 && (
                    <div className="space-y-3">
                        {settings.map((s) => {
                            const draft = drafts[s.config_key];
                            const dirty = draft !== undefined && draft !== s.config_value;
                            return (
                                <div key={s.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold font-mono">{s.config_key}</span>
                                            <Badge variant="outline" className="text-[10px]">{s.config_type}</Badge>
                                            {s.is_secret && <Lock className="h-3 w-3 text-muted-foreground" />}
                                        </div>
                                    </div>
                                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                                    <div className="flex gap-2">
                                        <input
                                            type={s.is_secret ? 'password' : 'text'}
                                            value={draft ?? s.config_value}
                                            onChange={(e) => setDrafts((prev) => ({ ...prev, [s.config_key]: e.target.value }))}
                                            className="flex-1 bg-accent/20 p-2 rounded-lg border border-border text-sm font-mono focus:ring-1 focus:ring-primary outline-none"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0 gap-1.5"
                                            disabled={!dirty || upsert.isPending}
                                            onClick={() => handleSave(s.config_key)}
                                        >
                                            {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function PlatformBillingCard() {
    const { data, isLoading } = usePlatformBilling();
    const update = useUpdatePlatformBilling();
    const [costPerSms, setCostPerSms] = useState('');
    const [providerCostPerSms, setProviderCostPerSms] = useState('');
    const [minMarkup, setMinMarkup] = useState('');
    const [minTopup, setMinTopup] = useState('');

    useEffect(() => {
        if (!data) return;
        setCostPerSms(String(data.cost_per_sms ?? ''));
        setProviderCostPerSms(String(data.provider_cost_per_sms ?? ''));
        setMinMarkup(String(data.min_markup_percentage ?? ''));
        setMinTopup(String(data.min_topup_amount ?? ''));
    }, [data]);

    const handleSave = async () => {
        try {
            await update.mutateAsync({
                cost_per_sms: Number(costPerSms) || 0,
                provider_cost_per_sms: Number(providerCostPerSms) || 0,
                min_markup_percentage: Number(minMarkup) || 0,
                min_topup_amount: Number(minTopup) || 0,
            });
            toast.success('Billing settings saved');
        } catch (e: any) {
            toast.error(e?.response?.data?.error ?? 'Failed to save billing settings');
        }
    };

    return (
        <Card>
            <CardHeader className="border-b border-border/50 py-4">
                <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-tight">SMS Billing</h3>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <p className="text-xs text-muted-foreground">
                    Tenant-facing SMS credit pricing. WhatsApp is billed via subscription plans (Billing &gt; WhatsApp plans), not here.
                </p>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cost per SMS (KES, tenant-facing)</label>
                                <input value={costPerSms} onChange={(e) => setCostPerSms(e.target.value)} className="w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm font-mono focus:ring-1 focus:ring-primary outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Provider cost per SMS (KES, real cost)</label>
                                <input value={providerCostPerSms} onChange={(e) => setProviderCostPerSms(e.target.value)} className="w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm font-mono focus:ring-1 focus:ring-primary outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Minimum markup (%)</label>
                                <input value={minMarkup} onChange={(e) => setMinMarkup(e.target.value)} className="w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm font-mono focus:ring-1 focus:ring-primary outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Minimum top-up amount (KES)</label>
                                <input value={minTopup} onChange={(e) => setMinTopup(e.target.value)} className="w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm font-mono focus:ring-1 focus:ring-primary outline-none" />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-border/50">
                            <Button size="sm" className="gap-2 px-6" disabled={update.isPending} onClick={handleSave}>
                                {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Save
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default function PlatformConfigurationPage() {
    const { data: destination, isLoading: destLoading } = usePlatformBackupDestination();
    const updateDest = useUpdatePlatformBackupDestination();
    const testDest = useTestPlatformBackupDestination();

    const handleSaveDest = async (body: UpsertBackupDestination) => {
        try {
            await updateDest.mutateAsync(body);
            toast.success('Backup destination saved');
        } catch (e: any) {
            toast.error(e?.response?.data?.error ?? 'Failed to save backup destination');
        }
    };

    const handleTestDest = (body: UpsertBackupDestination) => {
        testDest.mutate(body);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings2 className="h-6 w-6" />
                    Configuration
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Platform-wide defaults: service config keys, the default backup mirror destination, and SMS billing rates.
                    Provider credentials live under <span className="font-mono">Providers</span>; the credential encryption key is
                    managed from <span className="font-mono">Settings &gt; Security</span> (tenant context: codevertex).
                </p>
            </div>

            <div className="rounded-xl border border-border bg-accent/5 p-4 flex items-center gap-3">
                <KeyRound className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                    Looking for the credential encryption key? It lives on the platform tenant&apos;s own Settings &gt; Security page,
                    since it&apos;s scoped to that tenant context like the rest of Settings.
                </p>
            </div>

            <ServiceConfigEditor />

            <BackupDestinationForm
                title="Default Backup Destination"
                description="Applies to every tenant that has not configured its own override under Settings > Security."
                data={destination}
                isLoading={destLoading}
                onSave={handleSaveDest}
                saving={updateDest.isPending}
                onTest={handleTestDest}
                testing={testDest.isPending}
                testResult={testDest.data}
            />

            <PlatformBillingCard />
        </div>
    );
}
