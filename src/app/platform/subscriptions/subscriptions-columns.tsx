'use client';

// DataTable column definitions for the platform-admin WhatsApp Subscriptions table — mirrors the
// platform's <page>-columns.tsx convention (see templates/template-columns.tsx).

import { Badge, Button } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { WhatsAppSubscriptionAdminRow } from '@/lib/api/whatsapp';
import { Banknote, CheckCircle2, Clock, RefreshCw, XCircle, Zap } from 'lucide-react';

const STATUS_META: Record<WhatsAppSubscriptionAdminRow['status'], { label: string; className: string; icon: typeof CheckCircle2 }> = {
    active: { label: 'Active', className: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: XCircle },
    expired: { label: 'Expired', className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', icon: Clock },
    trial: { label: 'Trial', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Zap },
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysUntil(dateStr: string): number {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function buildSubscriptionColumns(
    onRecordPayment: (row: WhatsAppSubscriptionAdminRow) => void
): DataTableColumn<WhatsAppSubscriptionAdminRow>[] {
    return [
        {
            key: 'tenant',
            header: 'Tenant',
            primary: true,
            sortable: true,
            filterable: true,
            accessor: (r) => r.tenant_name || r.tenant_slug,
            render: (r) => (
                <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{r.tenant_name || r.tenant_slug}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.tenant_slug}</p>
                </div>
            ),
        },
        {
            key: 'plan',
            header: 'Plan',
            sortable: true,
            filterable: true,
            accessor: (r) => r.plan.name,
            render: (r) => (
                <div>
                    <p className="text-sm font-medium">{r.plan.name}</p>
                    <p className="text-xs text-muted-foreground">KES {r.plan.price_monthly.toLocaleString()}/mo</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            filterable: true,
            filterOptions: Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
            accessor: (r) => r.status,
            render: (r) => {
                const meta = STATUS_META[r.status];
                const Icon = meta.icon;
                return (
                    <Badge className={cn('gap-1 rounded-full text-[10px] uppercase tracking-wider', meta.className)}>
                        <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                );
            },
        },
        {
            key: 'messages_used',
            header: 'Messages Used',
            hideBelow: 'md',
            align: 'right',
            accessor: (r) => r.messages_used,
            render: (r) => (
                <span className="text-sm tabular-nums">
                    {r.messages_used.toLocaleString()}
                    {r.plan.messages_per_month > 0 && (
                        <span className="text-muted-foreground"> / {r.plan.messages_per_month.toLocaleString()}</span>
                    )}
                </span>
            ),
        },
        {
            key: 'expires_at',
            header: 'Next Renewal',
            sortable: true,
            hideBelow: 'sm',
            accessor: (r) => r.expires_at,
            render: (r) => {
                const days = daysUntil(r.expires_at);
                const overdue = days < 0 && r.status === 'active';
                const soon = days >= 0 && days <= 7 && r.status === 'active';
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">{formatDate(r.expires_at)}</span>
                        {r.auto_renew && r.status === 'active' && (
                            <RefreshCw className="h-3 w-3 text-muted-foreground/60" aria-label="Auto-renews" />
                        )}
                        {overdue && <Badge variant="error" className="text-[10px] px-1.5 py-0">Overdue</Badge>}
                        {soon && <Badge variant="warning" className="text-[10px] px-1.5 py-0">Due soon</Badge>}
                    </div>
                );
            },
        },
        {
            key: 'actions',
            header: '',
            mobileAction: true,
            exportable: false,
            align: 'right',
            render: (r) => (
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onRecordPayment(r);
                    }}
                >
                    <Banknote className="h-3.5 w-3.5" /> Record &amp; Mark Paid
                </Button>
            ),
        },
    ];
}
