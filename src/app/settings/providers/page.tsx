'use client';

import { Badge, Button, Card, CardContent, Switch } from '@/components/ui/base';
import { useTenantProviders, useTestTenantProvider, useWebhookConfig } from '@/hooks/use-settings';
import { settingsApi } from '@/lib/api/settings';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, CheckCircle2, ChevronDown, Copy, Globe, Loader2, Lock, Mail, MessageCircle, MessageSquare, PlugZap, Save, Webhook, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const EMAIL_PROVIDERS = ['smtp', 'sendgrid', 'brevo'];
const SMS_PROVIDERS = ['twilio', 'africastalking', 'vonage', 'plivo'];
// meta_cloud (official Meta WhatsApp Cloud API) is preferred; apiwap is a fallback aggregator.
const WHATSAPP_PROVIDERS = ['meta_cloud', 'apiwap'];
// Push (FCM) is platform-level only — configured at /platform/providers, not per-tenant
const PUSH_PROVIDERS: string[] = [];

function getProvidersForChannel(channelId: string): string[] {
    switch (channelId) {
        case 'email': return EMAIL_PROVIDERS;
        case 'sms': return SMS_PROVIDERS;
        case 'whatsapp': return WHATSAPP_PROVIDERS;
        case 'push': return PUSH_PROVIDERS;
        default: return [];
    }
}

const FIELD_DEFAULTS: Record<string, string> = {
    port: '587',
    start_tls: 'true',
    host: 'smtp.gmail.com',
};

function ProviderSettingsForm({ fields, settings, savedSettings, isLoading, isSaving, onFieldChange, onSave }: {
    fields: { key: string; label: string; type: string; placeholder: string }[];
    settings: Record<string, string>;
    savedSettings?: Record<string, string>;
    isLoading: boolean;
    isSaving: boolean;
    onFieldChange: (key: string, value: string) => void;
    onSave: () => void;
}) {
    if (fields.length === 0) return (
        <div className="bg-muted/30 p-2.5 rounded-lg border border-border text-xs text-muted-foreground flex items-center gap-2">
            <Lock className="h-3 w-3 shrink-0" />
            No configurable settings for this provider.
        </div>
    );

    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading settings...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map((field) => field.type === 'banner' ? (
                        <div key={field.key} className="md:col-span-2 rounded-lg bg-primary/10 border border-primary/30 p-3 text-xs text-foreground leading-relaxed">
                            <span className="font-bold text-primary">ℹ️ {field.label || 'Guide'}:</span> {field.placeholder}
                        </div>
                    ) : (
                        <div key={field.key} className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                {field.type === 'password' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                {field.label}
                            </label>
                            {field.type === 'switch' ? (
                                <div className="flex items-center h-10 pt-1">
                                    <Switch
                                        checked={(settings[field.key] ?? FIELD_DEFAULTS[field.key] ?? 'true') !== 'false'}
                                        onCheckedChange={(val) => onFieldChange(field.key, val ? 'true' : 'false')}
                                    />
                                </div>
                            ) : (
                                <input
                                    type={field.type}
                                    value={settings[field.key] ?? FIELD_DEFAULTS[field.key] ?? ''}
                                    placeholder={savedSettings?.[field.key] && savedSettings[field.key] !== '' ? 'Leave blank to keep current value' : field.placeholder}
                                    onChange={(e) => onFieldChange(field.key, e.target.value)}
                                    className="w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm font-mono focus:ring-1 focus:ring-primary outline-none transition-all"
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="pt-2 flex justify-end">
                <Button
                    size="sm"
                    className="gap-2 shadow-lg shadow-primary/10"
                    disabled={isSaving}
                    onClick={onSave}
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
}

function TestConnectionSection({ channelId, providerName }: { channelId: string; providerName: string }) {
    const [to, setTo] = useState('');
    const testMutation = useTestTenantProvider();
    const requiresTo = channelId === 'email';

    const handleTest = () => {
        testMutation.mutate({ provider_type: channelId, provider_name: providerName, to: to.trim() || undefined });
    };

    const result = testMutation.data;

    return (
        <div className="pt-4 mt-2 border-t border-border/50 space-y-3">
            <div className="flex items-center gap-2">
                <PlugZap className="h-3.5 w-3.5 text-primary" />
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Test Connection</h4>
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder={requiresTo ? 'Email address to send a test message to' : 'Optional — phone number/recipient for a real test send'}
                    className="flex-1 bg-accent/20 p-2.5 rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary outline-none"
                />
                <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    disabled={testMutation.isPending || (requiresTo && !to.trim())}
                    onClick={handleTest}
                >
                    {testMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
                    Test
                </Button>
            </div>
            {!requiresTo && (
                <p className="text-[11px] text-muted-foreground">
                    Leave the recipient blank to just verify the credentials (account balance / number status) without sending a real message, where supported.
                </p>
            )}
            {result && (
                <div className={cn(
                    "flex items-start gap-2 p-3 rounded-lg border text-xs",
                    result.success ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400" : "bg-destructive/5 border-destructive/20 text-destructive"
                )}>
                    {result.success ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                    <div className="space-y-1">
                        <p className="font-semibold">{result.success ? (result.message ?? 'Connection verified') : (result.error ?? 'Test failed')}</p>
                        {result.info && (
                            <div className="font-mono text-[11px] opacity-80 space-y-0.5">
                                {Object.entries(result.info).map(([k, v]) => (
                                    <div key={k}>{k}: {String(v)}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {testMutation.isError && !result && (
                <div className="flex items-start gap-2 p-3 rounded-lg border bg-destructive/5 border-destructive/20 text-destructive text-xs">
                    <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{(testMutation.error as any)?.response?.data?.error ?? 'Test connection failed'}</span>
                </div>
            )}
        </div>
    );
}

function WebhookConfigCard({ kind }: { kind: 'whatsapp' | 'sms' }) {
    const { data, isLoading } = useWebhookConfig();

    const copy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Failed to copy');
        }
    };

    if (isLoading || !data) return null;

    const rows = kind === 'whatsapp'
        ? [
            { label: 'Callback URL', value: data.whatsapp_callback_url },
            { label: 'Verify Token', value: data.whatsapp_verify_token },
        ]
        : [
            { label: 'Delivery Report Callback URL', value: data.africastalking_dlr_callback_url },
        ];

    return (
        <div className="mb-4 p-4 rounded-lg bg-accent/10 border border-border space-y-3">
            <div className="flex items-center gap-2">
                <Webhook className="h-3.5 w-3.5 text-primary" />
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Webhook Configuration — paste into {kind === 'whatsapp' ? "Meta's WhatsApp Manager" : "Africa's Talking dashboard"}
                </h4>
            </div>
            {rows.map((row) => (
                <div key={row.label} className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{row.label}</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-card p-2 rounded-lg border border-border text-xs font-mono truncate">{row.value}</div>
                        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(row.value)}>
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ProvidersPage() {
    const { data: providers = [], isLoading: loading, isError, refetch } = useTenantProviders();
    const queryClient = useQueryClient();
    const [changingChannel, setChangingChannel] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [providerSettings, setProviderSettings] = useState<Record<string, Record<string, string>>>({});
    const [savedProviderSettings, setSavedProviderSettings] = useState<Record<string, Record<string, string>>>({});
    const [loadingSettings, setLoadingSettings] = useState<string | null>(null);
    const [savingSettings, setSavingSettings] = useState<string | null>(null);

    // Push (FCM) is platform-level — managed at /platform/providers by superadmin
    const channels = [
        { id: 'email', name: 'Email', icon: Mail, description: 'SMTP, SendGrid, Brevo, or AWS SES', color: 'blue' },
        { id: 'sms', name: 'SMS', icon: MessageSquare, description: 'Twilio, Infobip, or AfricasTalking', color: 'green' },
        {
            id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle,
            description: 'Add your own WhatsApp Business phone number (Meta Cloud API or apiwap). Optional — without one, sends use the platform\'s shared number.',
            color: 'green',
        },
    ];

    const handleSelectProvider = async (channelId: string, providerName: string) => {
        try {
            setSaving(channelId);
            await settingsApi.updateProvider({
                provider_type: channelId,
                provider_name: providerName,
            });
            toast.success(`${channelId} provider changed to ${providerName}`);
            await queryClient.invalidateQueries({ queryKey: ['settings', 'current', 'providers'] });
            setChangingChannel(null);
            // Load settings for the newly selected provider
            loadProviderSettings(channelId, providerName);
        } catch (error: any) {
            const msg = error?.response?.data?.error || error?.message || 'Failed to change provider';
            toast.error(msg);
        } finally {
            setSaving(null);
        }
    };

    const PROVIDER_FIELDS: Record<string, { key: string; label: string; type: string; placeholder: string }[]> = {
        smtp: [
            { key: '_smtp_guide', label: 'SMTP Guide', type: 'banner', placeholder: 'Port 465 → SSL/TLS (implicit encryption). Port 587 → STARTTLS (upgrade to TLS). Port 25 → Unencrypted (not recommended). Most providers (Gmail, Zoho, Outlook) use port 465 (SSL) or 587 (STARTTLS).' },
            { key: 'host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
            { key: 'port', label: 'Port', type: 'text', placeholder: '587' },
            { key: 'username', label: 'Username', type: 'text', placeholder: 'user@example.com' },
            { key: 'password', label: 'Password', type: 'password', placeholder: 'Leave empty to keep current value' },
            { key: 'from', label: 'From Address', type: 'text', placeholder: 'no-reply@yourcompany.com' },
            { key: 'start_tls', label: 'Start TLS', type: 'switch', placeholder: 'Enable for port 587. Disable for port 465 (SSL).' },
        ],
        sendgrid: [
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Leave empty to keep current value' },
            { key: 'from', label: 'From Address', type: 'text', placeholder: 'no-reply@yourcompany.com' },
        ],
        brevo: [
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Leave empty to keep current value' },
            { key: 'sender_email', label: 'Sender Email', type: 'text', placeholder: 'no-reply@yourcompany.com' },
            { key: 'sender_name', label: 'Sender Name', type: 'text', placeholder: 'Your Company' },
        ],
        twilio: [
            { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'ACxxxx' },
            { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: 'Leave empty to keep current value' },
            { key: 'from', label: 'From Number', type: 'text', placeholder: '+1234567890' },
        ],
        africastalking: [
            { key: 'username', label: 'Username', type: 'text', placeholder: 'sandbox' },
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Leave empty to keep current value' },
            { key: 'from', label: 'Sender ID', type: 'text', placeholder: 'YOURAPP' },
        ],
        vonage: [
            { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'xxxx' },
            { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Leave empty to keep current value' },
            { key: 'from', label: 'From', type: 'text', placeholder: 'YourApp' },
        ],
        plivo: [
            { key: 'auth_id', label: 'Auth ID', type: 'text', placeholder: 'xxxx' },
            { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: 'Leave empty to keep current value' },
            { key: 'from', label: 'From Number', type: 'text', placeholder: '+1234567890' },
        ],
        fcm: [
            { key: 'service_account', label: 'Service Account JSON', type: 'text', placeholder: 'Paste FCM service account JSON' },
        ],
        meta_cloud: [
            { key: '_meta_guide', label: 'Connect WhatsApp', type: 'banner', placeholder: 'Self-serve connection is coming soon. Until then, our team can set up your number for you — once done, paste the Phone Number ID they give you below.' },
            { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: 'e.g. 1262404020292374' },
        ],
        apiwap: [
            { key: 'instance_id', label: 'Instance ID', type: 'text', placeholder: 'Your apiwap instance ID' },
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Leave empty to keep current value' },
        ],
    };

    const loadProviderSettings = async (providerType: string, providerName: string) => {
        const settingsKey = `${providerType}:${providerName}`;
        if (providerSettings[settingsKey]) return;
        try {
            setLoadingSettings(settingsKey);
            const res = await settingsApi.getProviderSettings(providerType, providerName);
            const loaded = res.settings ?? {};
            setProviderSettings(prev => ({ ...prev, [settingsKey]: loaded }));
            setSavedProviderSettings(prev => ({ ...prev, [settingsKey]: { ...loaded } }));
        } catch {
            setProviderSettings(prev => ({ ...prev, [settingsKey]: {} }));
        } finally {
            setLoadingSettings(null);
        }
    };

    const handleSaveSettings = async (providerType: string, providerName: string) => {
        const settingsKey = `${providerType}:${providerName}`;
        const settings = providerSettings[settingsKey] ?? {};
        try {
            setSavingSettings(settingsKey);
            await settingsApi.saveProviderSettings({ provider_type: providerType, provider_name: providerName, settings });
            toast.success('Provider settings saved');
        } catch (error: any) {
            const msg = error?.response?.data?.error || 'Failed to save settings';
            toast.error(msg);
        } finally {
            setSavingSettings(null);
        }
    };

    const updateSettingField = (providerType: string, providerName: string, key: string, value: string) => {
        const settingsKey = `${providerType}:${providerName}`;
        setProviderSettings(prev => ({
            ...prev,
            [settingsKey]: { ...(prev[settingsKey] ?? {}), [key]: value },
        }));
    };

    // Load settings when a provider is active
    useEffect(() => {
        providers.forEach((p: any) => {
            const type = p.channel ?? p.provider_type;
            const name = p.provider_name;
            if (type && name) loadProviderSettings(type, name);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providers]);

    if (loading && providers.length === 0) return <div className="p-12 text-center text-muted-foreground transition-all animate-pulse">Initializing providers...</div>;

    return (
        <div className="space-y-6">
            {isError && (
                <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                    <p className="text-sm text-destructive">Failed to load provider settings.</p>
                    <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                </div>
            )}
            <div className="grid grid-cols-1 gap-6">
                {channels.map((channel) => {
                    const config = providers.find((p: { channel?: string; provider_type?: string }) => (p.channel ?? p.provider_type) === channel.id);
                    const Icon = channel.icon;
                    const isChanging = changingChannel === channel.id;
                    const availableProviders = getProvidersForChannel(channel.id);

                    return (
                        <Card key={channel.id} className="overflow-hidden group hover:border-primary/30 transition-all shadow-sm">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                                    <div className="p-6 md:w-80 bg-accent/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center border border-border shadow-sm",
                                                channel.color === 'blue' ? "bg-blue-500/10 text-blue-500" :
                                                    channel.color === 'green' ? "bg-green-500/10 text-green-500" :
                                                        "bg-orange-500/10 text-orange-500"
                                            )}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold">{channel.name}</h3>
                                                <Badge variant={config ? "default" : "outline"} className={cn("text-[10px] uppercase tracking-wider", !config && "text-muted-foreground opacity-50")}>
                                                    {config ? 'Configured' : 'Not Configured'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{channel.description}</p>
                                    </div>

                                    <div className="p-6 flex-1 bg-card">
                                        {config ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                        <span className="text-sm font-semibold uppercase tracking-tight">Active: {config.provider_name}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-primary hover:bg-primary/10 gap-1"
                                                        onClick={() => setChangingChannel(isChanging ? null : channel.id)}
                                                    >
                                                        Change Provider
                                                        <ChevronDown className={cn("h-3 w-3 transition-transform", isChanging && "rotate-180")} />
                                                    </Button>
                                                </div>

                                                {isChanging && (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-accent/10 rounded-lg border border-border">
                                                        {availableProviders.map((prov) => (
                                                            <button
                                                                key={prov}
                                                                disabled={saving === channel.id}
                                                                onClick={() => handleSelectProvider(channel.id, prov)}
                                                                className={cn(
                                                                    "flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all capitalize",
                                                                    config.provider_name === prov
                                                                        ? "bg-primary/10 border-primary text-primary"
                                                                        : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                                                                )}
                                                            >
                                                                {prov}
                                                                {config.provider_name === prov && <Check className="h-4 w-4" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {!isChanging && <>
                                                    {config.provider_name === 'meta_cloud' && <WebhookConfigCard kind="whatsapp" />}
                                                    {config.provider_name === 'africastalking' && <WebhookConfigCard kind="sms" />}
                                                    <ProviderSettingsForm
                                                        fields={PROVIDER_FIELDS[config.provider_name] ?? []}
                                                        settings={providerSettings[`${channel.id}:${config.provider_name}`] ?? {}}
                                                        savedSettings={savedProviderSettings[`${channel.id}:${config.provider_name}`]}
                                                        isLoading={loadingSettings === `${channel.id}:${config.provider_name}`}
                                                        isSaving={savingSettings === `${channel.id}:${config.provider_name}`}
                                                        onFieldChange={(key, value) => updateSettingField(channel.id, config.provider_name, key, value)}
                                                        onSave={() => handleSaveSettings(channel.id, config.provider_name)}
                                                    />
                                                    <TestConnectionSection channelId={channel.id} providerName={config.provider_name} />
                                                </>}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center p-8 space-y-4 text-center">
                                                <div className="h-12 w-12 rounded-full bg-accent/50 flex items-center justify-center text-muted-foreground">
                                                    <Icon className="h-6 w-6 opacity-30" />
                                                </div>
                                                <div className="max-w-xs">
                                                    <h4 className="font-bold">Setup {channel.name}</h4>
                                                    <p className="text-xs text-muted-foreground mt-1">Connect a provider to enable {channel.name.toLowerCase()} notifications.</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="px-8 shadow-lg shadow-primary/20"
                                                    onClick={() => setChangingChannel(isChanging ? null : channel.id)}
                                                >
                                                    Configure Now
                                                </Button>
                                                {isChanging && (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
                                                        {availableProviders.map((prov) => (
                                                            <button
                                                                key={prov}
                                                                disabled={saving === channel.id}
                                                                onClick={() => handleSelectProvider(channel.id, prov)}
                                                                className="px-3 py-2.5 rounded-lg border border-border bg-card text-sm font-medium capitalize hover:border-primary/50 hover:bg-primary/5 transition-all"
                                                            >
                                                                {prov}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <AlertCircle className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold uppercase tracking-tight">Platform Fallback</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                If a channel is not configured for your organization, the platform default providers will be used. Customizing your own providers ensures better deliverability and distinct branding.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
