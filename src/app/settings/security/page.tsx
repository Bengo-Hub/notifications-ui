'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { AlertTriangle, Copy, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SecuritySettingsPage() {
    const [webhookSecret] = useState<string | null>(null); // TODO: load from GET /api/v1/settings/security when backend exposes it

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

                    <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="text-sm font-bold text-orange-600">IP Whitelisting</h4>
                                <p className="text-xs text-orange-600/70">Restrict provider API access to specific IP ranges.</p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10">Configure</Button>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Access Logs</h4>
                        <div className="space-y-2">
                            {[
                                { event: 'Provider Key Updated', user: 'Admin', time: '2 hours ago' },
                                { event: 'Branding Changed', user: 'Design Team', time: '5 hours ago' },
                                { event: 'Security Policy Toggle', user: 'Admin', time: '1 day ago' },
                            ].map((log, i) => (
                                <div key={i} className="flex items-center justify-between py-2 text-xs">
                                    <span className="font-semibold">{log.event}</span>
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <span>{log.user}</span>
                                        <span>•</span>
                                        <span>{log.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                            <ShieldAlert className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-destructive uppercase tracking-tight">Danger Zone</h4>
                            <p className="text-xs text-destructive/70 leading-relaxed mb-4">
                                Purging an organization will permanently delete all templates, provider configurations, and historical delivery logs. This action cannot be undone.
                            </p>
                            <Button size="sm" variant="destructive" className="px-6">Purge Organization Data</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
