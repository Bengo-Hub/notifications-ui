'use client';

import { Badge } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { WhatsAppConversation } from '@/lib/api/whatsapp-inbox';

function timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

export function buildConversationColumns(): DataTableColumn<WhatsAppConversation>[] {
    return [
        {
            key: 'contact',
            header: 'Contact',
            primary: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span className="font-semibold">{row.customer_name || `+${row.customer_wa_id}`}</span>
                    {row.customer_name && <span className="text-xs text-muted-foreground">+{row.customer_wa_id}</span>}
                </div>
            ),
        },
        {
            key: 'preview',
            header: 'Last message',
            render: (row) => (
                <span className="text-sm text-muted-foreground truncate block max-w-xs">
                    {row.last_message_preview || '—'}
                </span>
            ),
        },
        {
            key: 'time',
            header: 'Time',
            render: (row) => <span className="text-xs text-muted-foreground">{timeAgo(row.last_message_at)}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            mobileAction: true,
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    {row.unread_count > 0 && (
                        <Badge className="bg-primary text-primary-foreground">{row.unread_count}</Badge>
                    )}
                    <span
                        className={cn(
                            'inline-flex h-2 w-2 rounded-full',
                            row.window_open ? 'bg-green-500' : 'bg-muted-foreground/30'
                        )}
                        title={row.window_open ? 'Reply window open' : 'Reply window closed — template message required'}
                    />
                </div>
            ),
        },
    ];
}
