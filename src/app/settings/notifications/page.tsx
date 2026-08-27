'use client';

import { Card, CardContent } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import { Bell, Mail, MessageCircle, MessageSquare, RefreshCw, Smartphone } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import type { NotificationPreference } from '@/lib/api/settings';
import {
    useNotificationPreferences,
    useUpdateNotificationPreference,
} from '@/hooks/use-notification-preferences';
import { buildNotificationPreferenceColumns } from './notification-preferences-columns';

type ChannelFilter = 'all' | 'email' | 'sms' | 'whatsapp' | 'push';

const CHANNEL_TABS: { value: ChannelFilter; label: string; icon: typeof Bell }[] = [
    { value: 'all', label: 'All', icon: Bell },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: MessageSquare },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'push', label: 'Push', icon: Smartphone },
];

export default function NotificationPreferencesPage() {
    const { data, isLoading, isError, refetch } = useNotificationPreferences();
    const update = useUpdateNotificationPreference();
    const [channel, setChannel] = useState<ChannelFilter>('all');
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState(15);

    const rows = useMemo(() => data?.data ?? [], [data]);

    const counts = useMemo(() => {
        const c: Record<ChannelFilter, number> = { all: rows.length, email: 0, sms: 0, whatsapp: 0, push: 0 };
        for (const p of rows) {
            for (const ch of p.channels) {
                if (ch in c) c[ch as ChannelFilter]++;
            }
        }
        return c;
    }, [rows]);

    const filtered = useMemo(() => {
        if (channel === 'all') return rows;
        return rows.filter((p) => p.channels.includes(channel));
    }, [rows, channel]);

    const handleToggle = useCallback(async (pref: NotificationPreference, enabled: boolean) => {
        setPendingKey(pref.key);
        try {
            await update.mutateAsync({ key: pref.key, enabled });
            toast.success(`${pref.label} ${enabled ? 'enabled' : 'disabled'}`);
        } catch {
            toast.error(`Failed to update ${pref.label}`);
        } finally {
            setPendingKey(null);
        }
    }, [update]);

    const columns = useMemo(() => buildNotificationPreferenceColumns(handleToggle, pendingKey), [handleToggle, pendingKey]);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" /> Notification Preferences
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                        Choose which notifications this organization sends. Security-critical messages
                        (password resets, one-time codes) are always delivered. Essential business
                        notifications are on by default; optional ones stay off until you enable them.
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {CHANNEL_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = channel === tab.value;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setChannel(tab.value)}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors',
                                active
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                            <span className={cn('text-[10px] font-bold', active ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                                {counts[tab.value]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {isError ? (
                <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        Failed to load notification preferences.{' '}
                        <button onClick={() => refetch()} className="text-primary hover:underline">Retry</button>
                    </CardContent>
                </Card>
            ) : (
                <DataTable
                    columns={columns}
                    rows={filtered}
                    rowKey={(p) => p.key}
                    loading={isLoading}
                    loadingRows={8}
                    storageKey="notification-preferences-col-prefs"
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[10, 15, 25, 50]}
                    emptyState={
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-6">
                            <Bell className="h-10 w-10 opacity-30" />
                            <p className="font-medium">No notification types for this channel</p>
                        </div>
                    }
                />
            )}
        </div>
    );
}
