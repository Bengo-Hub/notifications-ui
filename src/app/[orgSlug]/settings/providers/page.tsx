'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { ProviderSetting, settingsApi } from '@/lib/api/settings';
import { cn } from '@/lib/utils';
import { AlertCircle, ExternalLink, Globe, Lock, Mail, MessageSquare, Save, Smartphone } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProvidersPage() {
    const { orgSlug } = useParams() as { orgSlug: string };
    const [providers, setProviders] = useState<ProviderSetting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProviders();
    }, [orgSlug]);

    const loadProviders = async () => {
        try {
            setLoading(true);
            const data = await settingsApi.listProviders(orgSlug);
            const list = (data as { providers?: ProviderSetting[] })?.providers ?? (Array.isArray(data) ? data : []);
            setProviders(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('Failed to load providers:', error);
            // Mock data for demo
            setProviders([
                { id: '1', tenant_id: orgSlug, channel: 'email', provider: 'smtp', provider_type: 'email', provider_name: 'SMTP', key: 'host', value: 'smtp.sendgrid.net', is_encrypted: false, is_platform: false, is_active: true, status: 'active' },
                { id: '2', tenant_id: orgSlug, channel: 'sms', provider: 'twilio', provider_type: 'sms', provider_name: 'Twilio', key: 'sid', value: 'ACxxxxxxxxxxxx', is_encrypted: true, is_platform: false, is_active: true, status: 'active' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const channels = [
        { id: 'email', name: 'Email', icon: Mail, description: 'SMTP, SendGrid, or AWS SES', color: 'blue' },
        { id: 'sms', name: 'SMS', icon: MessageSquare, description: 'Twilio, Infobip, or AfricasTalking', color: 'green' },
        { id: 'push', name: 'Web Push', icon: Smartphone, description: 'Firebase (FCM) or VAPID', color: 'orange' },
    ];

    if (loading) return <div className="p-12 text-center text-muted-foreground transition-all animate-pulse">Initializing providers...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
                {channels.map((channel) => {
                    const config = providers.find(p => p.channel === channel.id);
                    const Icon = channel.icon;

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

                                        <div className="mt-8">
                                            <Button variant="outline" size="sm" className="w-full gap-2">
                                                <ExternalLink className="h-3 w-3" />
                                                Documentation
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 bg-card">
                                        {config ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                        <span className="text-sm font-semibold uppercase tracking-tight">Active: {config.provider_name}</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">Change Provider</Button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                                            <Globe className="h-3 w-3" /> Endpoint / Host
                                                        </label>
                                                        <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono truncate">
                                                            {config.value}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                                            <Lock className="h-3 w-3" /> API Key / Secret
                                                        </label>
                                                        <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono flex items-center justify-between">
                                                            <span>••••••••••••••••</span>
                                                            <button className="text-[10px] text-primary hover:underline">Reveal</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 flex items-center justify-end gap-3">
                                                    <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/5 hover:text-destructive border-transparent">
                                                        Disable Channel
                                                    </Button>
                                                    <Button size="sm" className="gap-2 shadow-lg shadow-primary/10">
                                                        <Save className="h-3.5 w-3.5" />
                                                        Save Changes
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center p-8 space-y-4 text-center">
                                                <div className="h-12 w-12 rounded-full bg-accent/50 flex items-center justify-center text-muted-foreground">
                                                    <Icon className="h-6 w-6 opacity-30" />
                                                </div>
                                                <div className="max-w-xs">
                                                    <h4 className="font-bold">Setup {channel.name}</h4>
                                                    <p className="text-xs text-muted-foreground mt-1">Connect a provider to enable {channel.name.toLowerCase()} notifications for {orgSlug}.</p>
                                                </div>
                                                <Button size="sm" className="px-8 shadow-lg shadow-primary/20">Configure Now</Button>
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
                                If a channel is not configured for your organization, TruLoad will use the platform default providers. Customizing your own providers ensures better deliverability and distinct branding.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
