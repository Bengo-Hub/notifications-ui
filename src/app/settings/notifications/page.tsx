'use client';

import { Badge, Card, CardContent, CardHeader, Switch } from '@/components/ui/base';
import { Bell, Lock, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import type { NotificationPreference } from '@/lib/api/settings';
import {
    useNotificationPreferences,
    useUpdateNotificationPreference,
} from '@/hooks/use-notification-preferences';

function classBadge(pref: NotificationPreference) {
    switch (pref.class) {
        case 'locked':
            return (
                <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" /> Always on
                </Badge>
            );
        case 'essential':
            return <Badge variant="secondary">Default on</Badge>;
        default:
            return <Badge variant="outline">Default off</Badge>;
    }
}

function PreferenceRow({ pref }: { pref: NotificationPreference }) {
    const update = useUpdateNotificationPreference();
    const locked = pref.class === 'locked';

    const handleToggle = async (enabled: boolean) => {
        try {
            await update.mutateAsync({ key: pref.key, enabled });
            toast.success(`${pref.label} ${enabled ? 'enabled' : 'disabled'}`);
        } catch {
            toast.error(`Failed to update ${pref.label}`);
        }
    };

    return (
        <div className="flex items-center justify-between gap-4 py-3 border-b border-border/40 last:border-0">
            <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{pref.label}</span>
                    {classBadge(pref)}
                    {pref.overridden && !locked && (
                        <Badge variant="outline" className="text-[10px]">customized</Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-all">{pref.key}</p>
            </div>
            <Switch
                checked={locked ? true : pref.enabled}
                disabled={locked || update.isPending}
                onCheckedChange={handleToggle}
            />
        </div>
    );
}

export default function NotificationPreferencesPage() {
    const { data, isLoading, isError, refetch } = useNotificationPreferences();

    const groups = useMemo(() => {
        const byGroup = new Map<string, NotificationPreference[]>();
        for (const pref of data?.data ?? []) {
            const list = byGroup.get(pref.group) ?? [];
            list.push(pref);
            byGroup.set(pref.group, list);
        }
        return Array.from(byGroup.entries());
    }, [data]);

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
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
            </div>

            {isLoading && (
                <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        Loading notification preferences…
                    </CardContent>
                </Card>
            )}

            {isError && (
                <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        Failed to load notification preferences. Try refreshing.
                    </CardContent>
                </Card>
            )}

            {groups.map(([group, prefs]) => (
                <Card key={group}>
                    <CardHeader className="border-b border-border/50 py-4">
                        <h3 className="font-bold text-sm uppercase tracking-tight">{group}</h3>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {prefs.map((pref) => (
                            <PreferenceRow key={pref.key} pref={pref} />
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
