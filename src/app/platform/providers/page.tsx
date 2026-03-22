'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { usePlatformProviders, useTestPlatformProvider } from '@/hooks/use-settings';
import { settingsApi } from '@/lib/api/settings';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Globe, Loader2, Lock, Mail, MessageSquare, RefreshCw, Save, Server, Settings2, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const PROVIDER_FIELDS: Record<string, { key: string; label: string; type: string; placeholder: string }[]> = {
    smtp: [
        { key: 'host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
        { key: 'port', label: 'Port', type: 'text', placeholder: '587' },
        { key: 'username', label: 'Username', type: 'text', placeholder: 'user@example.com' },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
        { key: 'from', label: 'From Address', type: 'text', placeholder: 'no-reply@yourcompany.com' },
        { key: 'start_tls', label: 'Start TLS', type: 'text', placeholder: 'true' },
    ],
    sendgrid: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'SG.xxxx' },
        { key: 'from', label: 'From Address', type: 'text', placeholder: 'no-reply@yourcompany.com' },
    ],
    brevo: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xkeysib-xxxx' },
        { key: 'sender_email', label: 'Sender Email', type: 'text', placeholder: 'no-reply@yourcompany.com' },
        { key: 'sender_name', label: 'Sender Name', type: 'text', placeholder: 'Your Company' },
    ],
    africastalking: [
        { key: 'username', label: 'Username', type: 'text', placeholder: 'sandbox' },
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: '••••••••' },
        { key: 'from', label: 'Sender ID', type: 'text', placeholder: 'YOURAPP' },
    ],
    twilio: [
        { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'ACxxxx' },
        { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
        { key: 'from', label: 'From Number', type: 'text', placeholder: '+1234567890' },
    ],
    vonage: [
        { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'xxxx' },
        { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: '••••••••' },
        { key: 'from', label: 'From', type: 'text', placeholder: 'YourApp' },
    ],
    plivo: [
        { key: 'auth_id', label: 'Auth ID', type: 'text', placeholder: 'xxxx' },
        { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
        { key: 'from', label: 'From Number', type: 'text', placeholder: '+1234567890' },
    ],
    fcm: [
        { key: 'service_account', label: 'Service Account JSON', type: 'text', placeholder: 'Paste FCM service account JSON' },
    ],
};

const CHANNELS = [
    {
        id: 'email', name: 'Email', icon: Mail, color: 'blue',
        providers: [
            { name: 'smtp', label: 'SMTP' },
            { name: 'sendgrid', label: 'SendGrid' },
            { name: 'brevo', label: 'Brevo' },
        ],
    },
    {
        id: 'sms', name: 'SMS', icon: MessageSquare, color: 'green',
        providers: [
            { name: 'africastalking', label: "Africa's Talking" },
            { name: 'twilio', label: 'Twilio' },
            { name: 'vonage', label: 'Vonage' },
            { name: 'plivo', label: 'Plivo' },
        ],
    },
];

function ProviderConfigForm({ channelId, providerName, onConfigured }: {
    channelId: string;
    providerName: string;
    onConfigured: () => void;
}) {
    const fields = PROVIDER_FIELDS[providerName] ?? [];
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await settingsApi.getProviderSettings(channelId, providerName);
                setSettings(res.settings ?? {});
            } catch {
                setSettings({});
            } finally {
                setLoading(false);
            }
        })();
    }, [channelId, providerName]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save settings via the platform configure endpoint
            await settingsApi.configurePlatformProvider({
                provider_type: channelId,
                provider_name: providerName,
                settings,
            });
            toast.success(`${providerName} configured successfully`);
            onConfigured();
        } catch (error: any) {
            const msg = error?.response?.data?.error || 'Failed to save';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (fields.length === 0) return null;

    if (loading) return (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
    );

    return (
        <div className="space-y-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                            {field.type === 'password' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                            {field.label}
                        </label>
                        <input
                            type={field.type}
                            value={settings[field.key] ?? ''}
                            placeholder={field.placeholder}
                            onChange={(e) => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm font-mono focus:ring-1 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end">
                <Button size="sm" className="gap-2" disabled={saving} onClick={handleSave}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {saving ? 'Saving...' : 'Save & Activate'}
                </Button>
            </div>
        </div>
    );
}

export default function PlatformProvidersPage() {
    const { data: providers = [], isLoading: loading, refetch } = usePlatformProviders();
    const testMutation = useTestPlatformProvider();
    const queryClient = useQueryClient();
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testTo, setTestTo] = useState('');
    const [testModalId, setTestModalId] = useState<string | null>(null);

    const handleTest = async (providerType: string, providerName: string, pid: number) => {
        const to = testTo.trim();
        if (!to) {
            toast.error('Enter an email or phone number');
            return;
        }
        setTestingId(`${providerType}:${providerName}`);
        setTestModalId(null);
        setTestTo('');
        try {
            const res = await testMutation.mutateAsync({ id: String(pid), to });
            if (res?.success) {
                toast.success(res.message ?? 'Test sent');
            } else {
                toast.error(res?.error ?? 'Test failed');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.error ?? e?.message ?? 'Test failed');
        } finally {
            setTestingId(null);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">Loading platform providers...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Server className="h-7 w-7" />
                        Platform Providers
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Configure default providers for all tenants. Tenants can override with their own settings.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-6">
                {CHANNELS.map(({ id: channelId, name, icon: Icon, color, providers: channelProviders }) => (
                    <Card key={channelId}>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center border border-border shadow-sm",
                                    color === 'blue' ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-bold">{name}</h2>
                            </div>
                            <div className="space-y-3">
                                {channelProviders.map(({ name: pName, label }) => {
                                    const p = providers.find(
                                        (x: any) => x.provider_type === channelId && x.provider_name === pName
                                    );
                                    const pid = p?.id != null ? Number(p.id) : null;
                                    const isActive = p?.is_active ?? false;
                                    const isExpanded = expandedProvider === `${channelId}:${pName}`;
                                    const provKey = `${channelId}:${pName}`;
                                    const isTesting = testingId === provKey;
                                    const isTestModal = testModalId === provKey;

                                    return (
                                        <div key={pName} className="rounded-lg border border-border bg-card overflow-hidden">
                                            <div className="flex items-center justify-between py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold">{label}</span>
                                                    <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px] uppercase">
                                                        {isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {p && pid != null && (
                                                        <>
                                                            {isTestModal ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder={channelId === 'email' ? 'test@example.com' : '+254700000000'}
                                                                        value={testTo}
                                                                        onChange={(e) => setTestTo(e.target.value)}
                                                                        className="px-2 py-1 text-sm border rounded w-48 bg-accent/20"
                                                                    />
                                                                    <Button size="sm" onClick={() => handleTest(channelId, pName, pid)} disabled={isTesting}>
                                                                        {isTesting ? 'Sending...' : 'Send'}
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => { setTestModalId(null); setTestTo(''); }}>
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button variant="outline" size="sm" onClick={() => setTestModalId(provKey)} disabled={isTesting}>
                                                                    Test
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="gap-1"
                                                        onClick={() => setExpandedProvider(isExpanded ? null : provKey)}
                                                    >
                                                        <Settings2 className="h-4 w-4" />
                                                        Configure
                                                        <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                                                    </Button>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="px-4 pb-4">
                                                    <ProviderConfigForm
                                                        channelId={channelId}
                                                        providerName={pName}
                                                        onConfigured={() => {
                                                            queryClient.invalidateQueries({ queryKey: ['settings', 'platform', 'providers'] });
                                                            setExpandedProvider(null);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold">Platform Default Fallback</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Settings configured here serve as defaults for all tenants. If a tenant configures their own provider settings (via Settings &gt; Providers), those override these platform defaults. Secrets are stored encrypted at rest.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
