'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Copy, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { settingsApi, type EncryptionKeyStatus, type MailDeliveryKeyStatus } from '@/lib/api/settings';
import { PlatformKeyCard } from '@/components/platform-key-card';
import { useMe } from '@/hooks/useMe';
import { isPlatformOwnerOrSuperuser } from '@/lib/auth/permissions';

function CredentialEncryptionKeyCard() {
    return (
        <PlatformKeyCard<EncryptionKeyStatus>
            title="Credential Encryption Key"
            description="Encrypts provider API keys and secrets at rest. Managed at the platform level."
            notConfiguredLabel="Not configured — provider credentials stored unencrypted"
            generateLabel="Generate & activate new key"
            generatedToast="New encryption key generated and activated"
            failedToast="Failed to generate encryption key"
            footnote="New credentials encrypt with the active key; existing ones stay readable (decryption tries previous keys / plaintext). The raw key is never shown."
            load={settingsApi.getEncryptionKey}
            generate={() => settingsApi.updateEncryptionKey({ generate: true })}
            manual={{
                save: (key) => settingsApi.updateEncryptionKey({ key }),
                label: 'Provide your own key (base64-encoded 32 bytes)',
                placeholder: 'base64 32-byte key',
                savedToast: 'Encryption key activated',
                invalidFallback: 'Invalid key — must be a base64-encoded 32-byte value',
            }}
        />
    );
}

/** The key the mail server signs its delivery (bounce) webhook with; rotating it also updates the mail server. */
function MailDeliveryKeyCard() {
    return (
        <PlatformKeyCard<MailDeliveryKeyStatus>
            title="Mail Delivery Webhook Key"
            description="Signs the mail server's bounce notifications so only the mail server can mark an email as bounced."
            notConfiguredLabel="Not configured — bounces are not recorded yet"
            generateLabel="Rotate key"
            generatedToast="Key rotated and applied to the mail server"
            failedToast="Could not rotate the key"
            footnote="Rotating creates a new key and pushes it to the mail server. The previous key keeps working for a short time so notices already in flight are accepted. If the mail server does not accept the new key, nothing changes. The raw key is never shown."
            load={settingsApi.getMailDeliveryKey}
            generate={settingsApi.rotateMailDeliveryKey}
            extra={(status) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last bounce notice</label>
                        <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono truncate">
                            {status.last_event_at ? new Date(status.last_event_at).toLocaleString() : 'None yet'}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Webhook address</label>
                        <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono truncate" title={status.webhook_url}>
                            {status.webhook_url}
                        </div>
                    </div>
                </div>
            )}
        />
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
                            <div className="flex-1 min-w-0 bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono flex items-center gap-2">
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

            {isPlatformAdmin && <CredentialEncryptionKeyCard />}
            {isPlatformAdmin && <MailDeliveryKeyCard />}
        </div>
    );
}
