'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/base';
import { Modal } from '@/components/ui/modal';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useGrantCredits } from '@/hooks/use-credits-admin';
import { apiErrorMessage, type AdminCreditService, type AdminTenantRow } from '@/lib/api/credits-admin';
import { fmtUnits, SERVICE_LABEL } from './format';

const MAX_UNITS = 1_000_000;

/**
 * Adds units to a tenant without a payment. The grant is recorded as an adjustment with the note
 * as its reason. One idempotency key is held per open modal, so a retry after a dropped response
 * cannot grant twice.
 */
export function GrantCreditsModal({
    tenant,
    service,
    onClose,
}: {
    tenant: AdminTenantRow | null;
    service: AdminCreditService;
    onClose: () => void;
}) {
    if (!tenant) return null;
    return <GrantForm key={tenant.tenant_id + service} tenant={tenant} service={service} onClose={onClose} />;
}

function GrantForm({ tenant, service, onClose }: { tenant: AdminTenantRow; service: AdminCreditService; onClose: () => void }) {
    const grant = useGrantCredits();
    const { confirm, dialog } = useConfirm();
    const [units, setUnits] = useState('');
    const [note, setNote] = useState('');
    const [key] = useState(() => crypto.randomUUID());
    const label = SERVICE_LABEL[service];

    const n = Number(units);
    const unitsError =
        units === ''
            ? ''
            : !Number.isInteger(n) || n <= 0
              ? 'Enter a whole number above zero.'
              : n > MAX_UNITS
                ? `At most ${fmtUnits(MAX_UNITS)} at a time.`
                : '';
    const ready = units !== '' && !unitsError && note.trim().length >= 3;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ready) return;
        const { ok } = await confirm({
            title: `Grant ${fmtUnits(n)} ${label} units?`,
            description: `${tenant.name} gets ${fmtUnits(n)} units at no charge. This is recorded as an adjustment and cannot be taken back from here.`,
            confirmLabel: 'Grant units',
        });
        if (!ok) return;
        try {
            const res = await grant.mutateAsync({ tenantId: tenant.tenant_id, service, units: n, reason: note.trim(), key });
            toast.success(res.applied ? `Granted ${fmtUnits(n)} ${label} units to ${tenant.name}` : 'This grant was already applied');
            onClose();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not grant the units. Try again.'));
        }
    };

    return (
        <>
            <Modal
                open
                onClose={grant.isPending ? () => undefined : onClose}
                title={`Grant ${label} units`}
                description={`${tenant.name} (${tenant.slug})`}
                className="w-full max-w-lg shadow-xl"
            >
                <form onSubmit={submit} className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        Current bundle balance {fmtUnits(tenant.bundle_balance)}. Granted units go into the bundle and never expire.
                    </p>
                    <label className="block space-y-1.5 text-sm">
                        <span className="font-medium">Units</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_UNITS}
                            step={1}
                            autoFocus
                            value={units}
                            onChange={(e) => setUnits(e.target.value)}
                            placeholder="For example 500"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {unitsError && <span className="text-xs text-destructive">{unitsError}</span>}
                    </label>
                    <label className="block space-y-1.5 text-sm">
                        <span className="font-medium">Note</span>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={200}
                            placeholder="Why these units are being granted. It stays in the tenant history."
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </label>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={grant.isPending}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={!ready || grant.isPending} className="gap-2">
                            {grant.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Review grant
                        </Button>
                    </div>
                </form>
            </Modal>
            {dialog}
        </>
    );
}
