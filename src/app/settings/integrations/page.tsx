'use client';

import { useState } from 'react';
import { Button, Card, CardContent } from '@/components/ui/base';
import { Globe, Link2, Loader2 } from 'lucide-react';

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://sso.codevertexafrica.com';
const NOTIFICATIONS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://notificationsapi.codevertexafrica.com';

export default function IntegrationsSettingsPage() {
    const [authApiUrl] = useState(AUTH_API_URL);
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');

    const inputClass = 'w-full bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none';

    const testAuthConnection = async () => {
        setTestStatus('loading');
        try {
            const res = await fetch(`${authApiUrl}/healthz`);
            setTestStatus(res.ok ? 'ok' : 'fail');
        } catch {
            setTestStatus('fail');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold">Integrations & Service Config</h2>
                <p className="text-muted-foreground text-sm mt-1">
                    Configure S2S auth, service URLs, and CORS for the Notifications service.
                </p>
            </div>

            {/* S2S Auth */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Link2 className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">S2S Auth</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Auth-API URL
                        </label>
                        <div className="flex gap-3">
                            <input
                                value={authApiUrl}
                                readOnly
                                className={`${inputClass} flex-1 opacity-60 cursor-not-allowed`}
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={testAuthConnection}
                                disabled={testStatus === 'loading'}
                                className="shrink-0"
                            >
                                {testStatus === 'loading' ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    'Test Connection'
                                )}
                            </Button>
                        </div>
                        {testStatus === 'ok' && (
                            <p className="text-xs text-green-600 font-medium">Connection successful</p>
                        )}
                        {testStatus === 'fail' && (
                            <p className="text-xs text-red-600 font-medium">Connection failed — check the URL</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Set via NEXT_PUBLIC_AUTH_API_URL environment variable.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Service URLs */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">Service URLs</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Notifications API Base URL (this service)
                        </label>
                        <input
                            value={NOTIFICATIONS_API_URL}
                            readOnly
                            className={`${inputClass} opacity-60 cursor-not-allowed`}
                        />
                        <p className="text-xs text-muted-foreground">
                            Set via NEXT_PUBLIC_API_URL environment variable.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* CORS */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">CORS</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Allowed Origins
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Set via the <code className="text-[11px] bg-accent/20 px-1 py-0.5 rounded">HTTP_ALLOWED_ORIGINS</code> environment
                            variable on this service — not editable here. Contact platform engineering to add an origin.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
