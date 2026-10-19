'use client';

import { Badge, Button, Card, CardContent, CardHeader, Switch } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import { usePlatformSettings, useUpsertPlatformSetting } from '@/hooks/use-platform-config';
import type { ServiceConfigItem } from '@/lib/api/platform-config';
import { Hash, KeyRound, ListFilter, Loader2, Lock, Save, Settings2, ToggleLeft, Type } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type SettingChip = 'all' | 'bool' | 'string' | 'int' | 'secret';

const CHIP_META: Record<SettingChip, { label: string; icon: typeof ListFilter }> = {
    all: { label: 'All', icon: ListFilter },
    bool: { label: 'Toggles', icon: ToggleLeft },
    string: { label: 'Text', icon: Type },
    int: { label: 'Numbers', icon: Hash },
    secret: { label: 'Secrets', icon: Lock },
};

function ServiceConfigEditor() {
    const { data: settings = [], isLoading, isError, refetch } = usePlatformSettings();
    const upsert = useUpsertPlatformSetting();
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [chip, setChip] = useState<SettingChip>('all');

    const handleSave = async (key: string, value: string, successMsg?: string) => {
        try {
            await upsert.mutateAsync({ key, body: { config_value: value } });
            toast.success(successMsg ?? `${key} updated`);
            setDrafts((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        } catch (e: any) {
            toast.error(e?.response?.data?.error ?? 'Failed to update setting');
        }
    };

    const counts = useMemo(() => {
        const c: Record<SettingChip, number> = { all: settings.length, bool: 0, string: 0, int: 0, secret: 0 };
        for (const s of settings) {
            if (s.config_type === 'bool') c.bool++;
            else if (s.config_type === 'int') c.int++;
            else c.string++;
            if (s.is_secret) c.secret++;
        }
        return c;
    }, [settings]);

    const filtered = useMemo(() => {
        if (chip === 'all') return settings;
        if (chip === 'secret') return settings.filter((s) => s.is_secret);
        return settings.filter((s) => s.config_type === chip);
    }, [settings, chip]);

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

                {!isLoading && !isError && settings.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {(Object.entries(CHIP_META) as [SettingChip, typeof CHIP_META.all][]).map(([value, meta]) => {
                            const Icon = meta.icon;
                            const active = chip === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setChip(value)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                                        active
                                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                            : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                                    )}
                                >
                                    <Icon className="h-3 w-3" />
                                    {meta.label}
                                    <span className={cn('text-[10px] font-bold', active ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                                        {counts[value]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
                    </div>
                )}
                {isError && (
                    <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm text-destructive">Failed to load platform settings.</p>
                        <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                    </div>
                )}
                {!isLoading && !isError && settings.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No platform config keys defined yet.</p>
                )}
                {!isLoading && filtered.length === 0 && settings.length > 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No settings in this category.</p>
                )}
                {!isLoading && filtered.length > 0 && (
                    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                        {filtered.map((s) => (
                            <ServiceConfigRow
                                key={s.id}
                                setting={s}
                                draft={drafts[s.config_key]}
                                onDraftChange={(v) => setDrafts((prev) => ({ ...prev, [s.config_key]: v }))}
                                onSave={handleSave}
                                saving={upsert.isPending}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ServiceConfigRow({
    setting: s,
    draft,
    onDraftChange,
    onSave,
    saving,
}: {
    setting: ServiceConfigItem;
    draft: string | undefined;
    onDraftChange: (v: string) => void;
    onSave: (key: string, value: string, successMsg?: string) => void;
    saving: boolean;
}) {
    const dirty = draft !== undefined && draft !== s.config_value;

    if (s.config_type === 'bool') {
        const checked = (draft ?? s.config_value) === 'true';
        return (
            <div className="p-4 flex items-start justify-between gap-4 hover:bg-accent/5 transition-colors">
                <div className="min-w-0">
                    <span className="text-xs font-bold font-mono">{s.config_key}</span>
                    {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                </div>
                <Switch
                    checked={checked}
                    disabled={saving}
                    onCheckedChange={(v) => onSave(s.config_key, v ? 'true' : 'false', `${s.config_key} ${v ? 'enabled' : 'disabled'}`)}
                />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-2 hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono">{s.config_key}</span>
                <Badge variant="outline" className="text-[10px]">{s.config_type}</Badge>
                {s.is_secret && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
            {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
            <div className="flex gap-2">
                <input
                    type={s.is_secret ? 'password' : s.config_type === 'int' ? 'number' : 'text'}
                    value={draft ?? s.config_value}
                    onChange={(e) => onDraftChange(e.target.value)}
                    className="flex-1 bg-accent/20 p-2 rounded-lg border border-border text-sm font-mono focus:ring-1 focus:ring-primary outline-none"
                />
                <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    disabled={!dirty || saving}
                    onClick={() => onSave(s.config_key, draft ?? s.config_value)}
                >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                </Button>
            </div>
        </div>
    );
}

export default function PlatformConfigurationPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings2 className="h-6 w-6" />
                    Configuration
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Platform-wide defaults for service config keys. SMS and WhatsApp prices, bundles and plans are set in
                    subscriptions. Provider credentials live under <span className="font-mono">Providers</span>; the credential encryption key is
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
        </div>
    );
}
