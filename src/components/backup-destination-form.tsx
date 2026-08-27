'use client';

import { Button, Card, CardContent, CardHeader, Switch } from '@/components/ui/base';
import type { BackupDestination, BackupDestinationTestResult, UpsertBackupDestination } from '@/lib/api/platform-config';
import { CheckCircle2, CloudCog, Loader2, Lock, PlugZap, Save, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const TYPES: { value: string; label: string }[] = [
    { value: 'pvc', label: 'None (local PVC only)' },
    { value: 's3', label: 'S3-compatible (AWS S3, MinIO, R2, Wasabi)' },
    { value: 'onedrive', label: 'OneDrive' },
    { value: 'gdrive', label: 'Google Drive' },
    { value: 'webdav', label: 'WebDAV (Nextcloud, ownCloud)' },
    { value: 'sftp', label: 'SFTP' },
    { value: 'smb', label: 'SMB / Windows share' },
];

const FIELDS_BY_TYPE: Record<string, { key: string; label: string; secret?: boolean; placeholder?: string }[]> = {
    s3: [
        { key: 'bucket', label: 'Bucket' },
        { key: 'region', label: 'Region', placeholder: 'us-east-1' },
        { key: 'endpoint', label: 'Endpoint (non-AWS S3-compatible)', placeholder: 'https://s3.example.com' },
        { key: 'provider', label: 'Provider', placeholder: 'AWS' },
        { key: 'access_key_id', label: 'Access Key ID', secret: true },
        { key: 'secret_access_key', label: 'Secret Access Key', secret: true },
        { key: 'session_token', label: 'Session Token (optional)', secret: true },
        { key: 'acl', label: 'ACL', placeholder: 'private' },
    ],
    onedrive: [
        { key: 'token', label: 'OAuth Token (rclone JSON)', secret: true },
        { key: 'client_id', label: 'Client ID' },
        { key: 'client_secret', label: 'Client Secret', secret: true },
        { key: 'drive_id', label: 'Drive ID' },
        { key: 'drive_type', label: 'Drive Type', placeholder: 'business' },
    ],
    gdrive: [
        { key: 'token', label: 'OAuth Token (rclone JSON)', secret: true },
        { key: 'client_id', label: 'Client ID' },
        { key: 'client_secret', label: 'Client Secret', secret: true },
        { key: 'drive_id', label: 'Root Folder ID' },
        { key: 'service_account_credentials', label: 'Service Account Credentials (JSON)', secret: true },
    ],
    webdav: [
        { key: 'url', label: 'URL' },
        { key: 'vendor', label: 'Vendor', placeholder: 'other' },
        { key: 'user', label: 'Username' },
        { key: 'pass', label: 'Password', secret: true },
        { key: 'bearer_token', label: 'Bearer Token (optional)', secret: true },
    ],
    sftp: [
        { key: 'host', label: 'Host' },
        { key: 'port', label: 'Port', placeholder: '22' },
        { key: 'user', label: 'Username' },
        { key: 'pass', label: 'Password', secret: true },
        { key: 'key_pem', label: 'Private Key (PEM, optional)', secret: true },
        { key: 'key_file_pass', label: 'Key Passphrase (optional)', secret: true },
    ],
    smb: [
        { key: 'host', label: 'Host' },
        { key: 'port', label: 'Port', placeholder: '445' },
        { key: 'user', label: 'Username' },
        { key: 'pass', label: 'Password', secret: true },
        { key: 'domain', label: 'Domain (optional)' },
        { key: 'share', label: 'Share name' },
    ],
};

export function BackupDestinationForm({
    title, description, data, isLoading, onSave, saving, onTest, testing, testResult,
}: {
    title: string;
    description: string;
    data?: BackupDestination;
    isLoading: boolean;
    onSave: (body: UpsertBackupDestination) => void;
    saving: boolean;
    onTest: (body: UpsertBackupDestination) => void;
    testing: boolean;
    testResult?: BackupDestinationTestResult;
}) {
    const [type, setType] = useState('pvc');
    const [enabled, setEnabled] = useState(false);
    const [remotePath, setRemotePath] = useState('');
    const [params, setParams] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!data) return;
        setType(data.type || 'pvc');
        setEnabled(data.enabled);
        setRemotePath(data.remote_path || '');
        const p: Record<string, string> = {};
        for (const param of data.params ?? []) {
            if (!param.is_secret) p[param.key] = param.value ?? '';
        }
        setParams(p);
    }, [data]);

    const fields = FIELDS_BY_TYPE[type] ?? [];
    const currentBody = (): UpsertBackupDestination => ({ type, enabled, remote_path: remotePath, params });

    return (
        <Card>
            <CardHeader className="border-b border-border/50 py-4">
                <div className="flex items-center gap-2">
                    <CloudCog className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-tight">{title}</h3>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <p className="text-xs text-muted-foreground">{description}</p>

                {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Destination type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Remote path / prefix</label>
                                <input
                                    value={remotePath}
                                    onChange={(e) => setRemotePath(e.target.value)}
                                    placeholder="notifications/backups"
                                    disabled={type === 'pvc'}
                                    className="w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {type !== 'pvc' && (
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-bold">Enable remote mirroring</h4>
                                    <p className="text-xs text-muted-foreground">Backups still write to the local PVC either way; this additionally mirrors them off-cluster.</p>
                                </div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                            </div>
                        )}

                        {type !== 'pvc' && fields.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                                {fields.map((f) => {
                                    const existing = data?.params?.find((p) => p.key === f.key);
                                    return (
                                        <div key={f.key} className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                                {f.secret && <Lock className="h-3 w-3" />}
                                                {f.label}
                                            </label>
                                            <input
                                                type={f.secret ? 'password' : 'text'}
                                                value={params[f.key] ?? ''}
                                                onChange={(e) => setParams((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                                placeholder={f.secret && existing?.set ? 'Leave blank to keep current value' : f.placeholder}
                                                className="w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm font-mono focus:ring-1 focus:ring-primary outline-none"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50">
                            {type !== 'pvc' && (
                                <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={testing} onClick={() => onTest(currentBody())}>
                                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
                                    Test Connection
                                </Button>
                            )}
                            <Button type="button" size="sm" className="gap-1.5" disabled={saving} onClick={() => onSave(currentBody())}>
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Save
                            </Button>
                        </div>

                        {testResult && (
                            <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${testResult.ok ? 'bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-destructive/5 border-destructive/20 text-destructive'}`}>
                                {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                                <span>{testResult.ok ? (testResult.message ?? 'Connection successful') : (testResult.error ?? 'Connection failed')}</span>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
