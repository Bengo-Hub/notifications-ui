'use client';

// DataTable column definitions for Notification Templates — split out of page.tsx to mirror the
// platform's <page>-columns.tsx convention (see settings/notifications/notification-preferences-columns.tsx).

import { Badge, Button } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { NotificationTemplate } from '@/lib/api/templates';
import { Edit2, Hash, Mail, MessageCircle, MessageSquare, Smartphone, Tag, Zap } from 'lucide-react';

const CHANNEL_META: Record<string, { icon: typeof Mail; className: string }> = {
    email: { icon: Mail, className: 'bg-blue-500/10 text-blue-500' },
    sms: { icon: MessageSquare, className: 'bg-green-500/10 text-green-500' },
    whatsapp: { icon: MessageCircle, className: 'bg-emerald-500/10 text-emerald-500' },
    push: { icon: Smartphone, className: 'bg-orange-500/10 text-orange-500' },
};

function channelIcon(channel: string) {
    const Icon = CHANNEL_META[channel]?.icon ?? Zap;
    return <Icon className="h-4 w-4" />;
}

export function buildTemplateColumns(
    canManage: boolean,
    onEdit: (template: NotificationTemplate) => void
): DataTableColumn<NotificationTemplate>[] {
    const columns: DataTableColumn<NotificationTemplate>[] = [
        {
            key: 'name',
            header: 'Template',
            primary: true,
            sortable: true,
            accessor: (t) => t.name,
            render: (t) => (
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border border-border shadow-sm',
                            CHANNEL_META[t.channel]?.className ?? 'bg-muted text-muted-foreground'
                        )}
                    >
                        {channelIcon(t.channel)}
                    </div>
                    <span className="font-bold">{t.name}</span>
                </div>
            ),
        },
        {
            key: 'channel',
            header: 'Channel',
            sortable: true,
            filterable: true,
            accessor: (t) => t.channel,
            render: (t) => <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{t.channel}</Badge>,
        },
        {
            key: 'category',
            header: 'Category',
            sortable: true,
            filterable: true,
            hideBelow: 'sm',
            accessor: (t) => t.category,
            render: (t) => (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    <Tag className="h-2.5 w-2.5 mr-1" />{t.category}
                </Badge>
            ),
        },
        {
            key: 'variables',
            header: 'Variables',
            hideBelow: 'md',
            align: 'right',
            accessor: (t) => t.variables?.length ?? 0,
            render: (t) =>
                t.variables?.length > 0 ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                        <Hash className="h-2.5 w-2.5 mr-0.5" />{t.variables.length}
                    </Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                ),
        },
    ];

    if (canManage) {
        columns.push({
            key: 'actions',
            header: '',
            mobileAction: true,
            exportable: false,
            align: 'right',
            render: (t) => (
                <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${t.name}`}
                    className="h-8 w-8 p-0"
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onEdit(t);
                    }}
                >
                    <Edit2 className="h-3.5 w-3.5" />
                </Button>
            ),
        });
    }

    return columns;
}
