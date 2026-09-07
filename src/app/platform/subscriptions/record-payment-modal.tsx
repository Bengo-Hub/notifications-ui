'use client';

import { Button } from '@/components/ui/base';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { useWhatsAppPlans, useRecordWhatsAppPayment } from '@/hooks/use-whatsapp';
import type { WhatsAppSubscriptionAdminRow } from '@/lib/api/whatsapp';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Platform-admin action: record a WhatsApp subscription payment received outside the normal
 * checkout flow (bank transfer, cash, till) and immediately mark it paid — for reconciling a
 * tenant's renewal without making them go through the self-serve pay flow again.
 */
export function RecordPaymentModal({
    row,
    onClose,
}: {
    row: WhatsAppSubscriptionAdminRow | null;
    onClose: () => void;
}) {
    const { data: plansData } = useWhatsAppPlans();
    const recordPayment = useRecordWhatsAppPayment();
    const [planId, setPlanId] = useState('');
    const [reference, setReference] = useState('');

    useEffect(() => {
        if (row) setPlanId(row.plan.id);
        setReference('');
    }, [row]);

    if (!row) return null;

    const plans = plansData?.data ?? [];

    const handleConfirm = async () => {
        if (!planId) return;
        try {
            await recordPayment.mutateAsync({ tenantId: row.tenant_id, plan_id: planId, reference: reference.trim() || undefined });
            toast.success(`Payment recorded for ${row.tenant_name || row.tenant_slug} — subscription will activate shortly`);
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to record payment');
        }
    };

    return (
        <Modal
            open={!!row}
            onClose={onClose}
            title={`Record payment — ${row.tenant_name || row.tenant_slug}`}
            description="Confirms a payment received outside the normal checkout flow (bank transfer, cash, till) and activates the subscription immediately."
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</label>
                    <div className="space-y-1.5">
                        {plans.map((plan) => (
                            <label
                                key={plan.id}
                                className={cn(
                                    'flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                                    planId === plan.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/20'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="plan"
                                        checked={planId === plan.id}
                                        onChange={() => setPlanId(plan.id)}
                                        className="h-4 w-4 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium">{plan.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">KES {plan.price_monthly.toLocaleString()}/mo</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="record-payment-reference" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Reference (optional)
                    </label>
                    <input
                        id="record-payment-reference"
                        type="text"
                        placeholder="e.g. bank transaction ID, till receipt no."
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button
                        size="sm"
                        disabled={!planId || recordPayment.isPending}
                        onClick={handleConfirm}
                    >
                        {recordPayment.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Confirm &amp; Mark Paid
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
