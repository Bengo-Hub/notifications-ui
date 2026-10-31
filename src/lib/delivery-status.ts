import type { ActivityLog, DeliveryStats } from '@/lib/api/analytics';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary';

/**
 * How each delivery_log status reads in a list. "skipped" means nothing went out: the gate held it
 * back (no SMS or WhatsApp plan or credits, an invalid or unverified recipient, a channel switched
 * off), so it must never look like a sent message.
 */
export const DELIVERY_STATUS: Record<ActivityLog['status'], { label: string; variant: BadgeVariant }> = {
    sent: { label: 'Sent', variant: 'default' },
    delivered: { label: 'Delivered', variant: 'success' },
    failed: { label: 'Failed', variant: 'error' },
    skipped: { label: 'Not sent', variant: 'secondary' },
};

export function deliveryStatus(status: string) {
    return DELIVERY_STATUS[status as ActivityLog['status']] ?? { label: status, variant: 'outline' as BadgeVariant };
}

/** The delivery rate, or null when nothing was attempted (a 0% would read as every send failing). */
export function deliveryRate(stats?: DeliveryStats | null): string | null {
    if (!stats || stats.totalSent + (stats.failed ?? 0) === 0) return null;
    return `${stats.deliveryRate.toFixed(1)}%`;
}
