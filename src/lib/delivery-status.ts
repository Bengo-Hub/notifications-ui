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
    read: { label: 'Read', variant: 'success' },
    failed: { label: 'Failed', variant: 'error' },
    skipped: { label: 'Not sent', variant: 'secondary' },
};

export function deliveryStatus(status: string) {
    return DELIVERY_STATUS[status as ActivityLog['status']] ?? { label: status, variant: 'outline' as BadgeVariant };
}

/**
 * Plain words for a provider's later refusal of a message it had accepted. Meta's most common
 * WhatsApp codes get an explanation; anything else shows Meta's own words with the code.
 */
export function whatsAppFailureReason(code?: string, detail?: string): string {
    switch (code) {
        case '131049':
            return '131049: Meta held it back (its limit on marketing messages per person)';
        case '131026':
            return '131026: this number cannot receive WhatsApp (no account, old app or terms not accepted); skipped for a week';
        case '131047':
            return '131047: a free reply outside the 24 hour window';
        case '131045':
            return '131045: the number needs registering again';
    }
    if (code && detail) return `${code}: ${detail}`;
    return code || detail || '';
}

/** The delivery rate, or null when nothing was attempted (a 0% would read as every send failing). */
export function deliveryRate(stats?: DeliveryStats | null): string | null {
    if (!stats || stats.totalSent + (stats.failed ?? 0) === 0) return null;
    return `${stats.deliveryRate.toFixed(1)}%`;
}
