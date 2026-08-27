'use client';

// DataTable column definitions for Notification Preferences — split out of page.tsx to mirror
// the platform's <page>-columns.tsx convention (see pos-ui's commissions-columns.tsx).

import { Badge, Button, Switch } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { NotificationPreference } from '@/lib/api/settings';
import { Lock, Mail, MessageCircle, MessageSquare, RotateCcw, Smartphone, SlidersHorizontal } from 'lucide-react';

const CHANNEL_META: Record<string, { label: string; icon: typeof Mail; className: string }> = {
    email: { label: 'Email', icon: Mail, className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    sms: { label: 'SMS', icon: MessageSquare, className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    whatsapp: { label: 'WhatsApp', icon: MessageCircle, className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    push: { label: 'Push', icon: Smartphone, className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
};

// Shows every AVAILABLE channel, dimming the ones the tenant has chosen not to actually use —
// so "this type CAN send SMS" and "this type WILL send SMS for this tenant" are both visible
// at a glance, without needing to open the edit modal.
function ChannelBadges({ channels, enabledChannels }: { channels: string[]; enabledChannels: string[] }) {
    if (channels.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {channels.map((ch) => {
                const meta = CHANNEL_META[ch];
                if (!meta) return null;
                const Icon = meta.icon;
                const on = enabledChannels.includes(ch);
                return (
                    <span
                        key={ch}
                        title={on ? undefined : 'Available but turned off for this tenant'}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            on ? meta.className : 'bg-muted text-muted-foreground/50 line-through decoration-1'
                        )}
                    >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                    </span>
                );
            })}
        </div>
    );
}

function ClassBadge({ pref }: { pref: NotificationPreference }) {
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

export function buildNotificationPreferenceColumns(
    onToggle: (pref: NotificationPreference, enabled: boolean) => void,
    pendingKey: string | null,
    // Explicit, derived from the FULL unpaginated dataset — the host now slices rows to the
    // current page before handing them to DataTable, and DataTable's own funnel-option
    // auto-derivation only ever sees whatever `rows` it's given, so without this the Category
    // checklist would silently shrink to whatever happens to be on the visible page.
    groupOptions: string[] = [],
    onEditChannels: (pref: NotificationPreference) => void = () => {},
    onReset: (pref: NotificationPreference) => void = () => {},
    resettingKey: string | null = null,
): DataTableColumn<NotificationPreference>[] {
    return [
        {
            key: 'label',
            header: 'Notification',
            primary: true,
            sortable: true,
            filterable: true,
            accessor: (p) => p.label,
            render: (p) => (
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{p.label}</span>
                        {p.overridden && p.class !== 'locked' && (
                            <Badge variant="outline" className="text-[10px]">customized</Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono break-all">{p.key}</p>
                </div>
            ),
        },
        {
            key: 'channels',
            header: 'Channels',
            filterable: true,
            filterOptions: Object.entries(CHANNEL_META).map(([value, meta]) => ({ value, label: meta.label })),
            accessor: (p) => p.channels.join(','),
            render: (p) => (
                <div className="flex items-center gap-1.5">
                    <ChannelBadges channels={p.channels} enabledChannels={p.enabledChannels} />
                    {p.channels.length > 1 && (
                        <button
                            type="button"
                            title="Choose which channels to use"
                            onClick={() => onEditChannels(p)}
                            className="text-muted-foreground/60 hover:text-primary transition-colors shrink-0"
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            ),
        },
        {
            key: 'group',
            header: 'Category',
            sortable: true,
            filterable: true,
            filterOptions: groupOptions.map((g) => ({ value: g })),
            hideBelow: 'md',
            accessor: (p) => p.group,
            render: (p) => <span className="text-sm text-muted-foreground">{p.group}</span>,
        },
        {
            key: 'class',
            header: 'Default',
            hideBelow: 'lg',
            accessor: (p) => p.class,
            render: (p) => <ClassBadge pref={p} />,
        },
        {
            key: 'enabled',
            header: 'Enabled',
            align: 'right',
            mobileAction: true,
            accessor: (p) => p.enabled,
            render: (p) => (
                <div className="flex items-center justify-end gap-2">
                    {p.class !== 'locked' && (p.overridden || p.channelsOverridden) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground/60 hover:text-primary"
                            title="Reset to default"
                            disabled={resettingKey === p.key}
                            onClick={() => onReset(p)}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Switch
                        checked={p.class === 'locked' ? true : p.enabled}
                        disabled={p.class === 'locked' || pendingKey === p.key}
                        onCheckedChange={(v) => onToggle(p, v)}
                    />
                </div>
            ),
        },
    ];
}
