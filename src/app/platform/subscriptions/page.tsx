'use client';

import { Card, CardContent } from '@/components/ui/base';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { useAllWhatsAppSubscriptions } from '@/hooks/use-whatsapp';
import { buildSubscriptionColumns } from './subscriptions-columns';
import { RecordPaymentModal } from './record-payment-modal';
import type { WhatsAppSubscriptionAdminRow } from '@/lib/api/whatsapp';
import { CreditCard } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function PlatformSubscriptionsPage() {
    const { data, isLoading, isError, refetch } = useAllWhatsAppSubscriptions();
    const [recordingRow, setRecordingRow] = useState<WhatsAppSubscriptionAdminRow | null>(null);

    const columns = useMemo(() => buildSubscriptionColumns(setRecordingRow), []);
    const rows = data?.data ?? [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> WhatsApp Subscriptions
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                    Every tenant&apos;s WhatsApp subscription, plan, and next renewal. Use &quot;Record &amp; Mark
                    Paid&quot; to reconcile a payment received outside the normal checkout flow (bank transfer,
                    cash, till) — it activates the subscription immediately.
                </p>
            </div>

            {isError ? (
                <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        Failed to load subscriptions.{' '}
                        <button onClick={() => refetch()} className="text-primary hover:underline">Retry</button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <DataTable<WhatsAppSubscriptionAdminRow>
                            columns={columns}
                            rows={rows}
                            rowKey={(r) => r.tenant_id}
                            loading={isLoading}
                            loadingRows={6}
                            storageKey="platform-whatsapp-subscriptions-col-prefs"
                            total={rows.length}
                            emptyState={
                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-12">
                                    <CreditCard className="h-10 w-10 opacity-30" />
                                    <p>No tenant has subscribed to WhatsApp yet.</p>
                                </div>
                            }
                        />
                    </CardContent>
                </Card>
            )}

            <RecordPaymentModal row={recordingRow} onClose={() => setRecordingRow(null)} />
        </div>
    );
}
