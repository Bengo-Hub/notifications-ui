'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { settingsApi, ProviderSetting } from '@/lib/api/settings';
import { Mail, MessageSquare, Plus, RefreshCw, Server } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CHANNELS = [
    { id: 'email', name: 'Email', icon: Mail, providers: [{ name: 'smtp', label: 'SMTP' }, { name: 'sendgrid', label: 'SendGrid' }] },
    { id: 'sms', name: 'SMS', icon: MessageSquare, providers: [{ name: 'africastalking', label: "Africa's Talking" }] },
] as const;

export default function PlatformProvidersPage() {
    const [providers, setProviders] = useState<ProviderSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testTo, setTestTo] = useState('');
    const [testModalId, setTestModalId] = useState<number | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            const res = await settingsApi.listPlatformProviders();
            setProviders(res?.providers ?? []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load platform providers');
            setProviders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleTest = async (id: number, providerType: string) => {
        const to = testTo.trim();
        if (!to) {
            toast.error('Enter an email or phone number to send the test to');
            return;
        }
        setTestingId(String(id));
        setTestModalId(null);
        setTestTo('');
        try {
            const res = await settingsApi.testPlatformProvider(String(id), { to });
            if (res?.success) {
                toast.success(res.message ?? 'Test sent successfully');
            } else {
                toast.error(res?.error ?? 'Test failed');
            }
        } catch (e: any) {
            const msg = e?.response?.data?.error ?? e?.message ?? 'Test failed';
            toast.error(msg);
        } finally {
            setTestingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
                Loading platform providers...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Server className="h-7 w-7" />
                        Platform providers
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Configure and test Email (SMTP, SendGrid) and SMS (Africa&apos;s Talking). Secrets are stored encrypted at rest.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-6">
                {CHANNELS.map(({ id: channelId, name, icon: Icon, providers: channelProviders }) => (
                    <Card key={channelId}>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <h2 className="font-semibold">{name}</h2>
                            </div>
                            <div className="space-y-3">
                                {channelProviders.map(({ name: pName, label }) => {
                                    const p = providers.find(
                                        (x) => x.provider_type === channelId && x.provider_name === pName
                                    );
                                    const pid = p?.id != null ? Number(p.id) : null;
                                    const isTesting = testingId === String(pid);
                                    return (
                                        <div
                                            key={pName}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-card"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{label}</span>
                                                {p ? (
                                                    <Badge variant={p.is_active ? 'default' : 'secondary'}>
                                                        {p.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">Not configured</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {p && pid != null && (
                                                    <>
                                                        {testModalId === pid ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder={channelId === 'email' ? 'test@example.com' : '+254700000000'}
                                                                    value={testTo}
                                                                    onChange={(e) => setTestTo(e.target.value)}
                                                                    className="px-2 py-1 text-sm border rounded w-48"
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleTest(pid, channelId)}
                                                                    disabled={isTesting}
                                                                >
                                                                    {isTesting ? 'Sending...' : 'Send test'}
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={() => { setTestModalId(null); setTestTo(''); }}>
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setTestModalId(pid)}
                                                                disabled={isTesting}
                                                            >
                                                                {isTesting ? 'Sending...' : 'Test'}
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                Configure via API: POST /api/v1/platform/providers with provider_type &quot;{channelId}&quot;, provider_name (e.g. smtp, sendgrid, africastalking), and settings.
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-muted/30">
                <CardContent className="p-4 text-sm text-muted-foreground">
                    Platform configs are not filtered by tenant. Tenant admins see only available providers and select one per channel; credentials stay at platform level.
                </CardContent>
            </Card>
        </div>
    );
}
