import type { BroadcastStatus, Channel } from '@/lib/api/broadcasts';

export const inputCls = 'w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary outline-none';

export const CHANNEL_LABELS: Record<Channel, string> = {
    email: 'Email',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    push: 'Push',
    in_app: 'Dashboard banner',
};

export const STATUS_LABELS: Record<BroadcastStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    pending_approval: { label: 'Awaiting approval', variant: 'warning' },
    scheduled: { label: 'Scheduled', variant: 'default' },
    sending: { label: 'Sending', variant: 'default' },
    paused: { label: 'Paused', variant: 'outline' },
    completed: { label: 'Sent', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'secondary' },
    rejected: { label: 'Rejected', variant: 'error' },
    failed: { label: 'Failed', variant: 'error' },
};

export const RECIPIENT_STATUS: Record<string, string> = {
    pending: 'Waiting',
    dispatching: 'Sending',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Failed',
    skipped: 'Not sent',
    suppressed: 'Opted out',
};

export const KIND_LABELS = {
    announcement: 'Announcement',
    greeting: 'Greeting',
    marketing: 'Offer or launch',
    service_notice: 'Service notice',
} as const;

/** Placeholders a message may use, with what each becomes. */
export const TOKENS: { token: string; hint: string }[] = [
    { token: '{first_name}', hint: 'Recipient first name, else "<Business> team"' },
    { token: '{business_name}', hint: "Recipient's business" },
    { token: '{sender_name}', hint: 'Your business name' },
    { token: '{occasion}', hint: 'Occasion name' },
    { token: '{year}', hint: 'Year' },
];

export function when(iso?: string | null): string {
    return iso
        ? new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'As soon as approved';
}

export function day(iso?: string): string {
    return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

/** ISO string to a datetime-local value in the user's own timezone, and back. */
export function toLocalInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function fromLocalInput(v: string): string | null {
    return v ? new Date(v).toISOString() : null;
}

export function apiError(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { error?: string; message?: string } } };
    return e?.response?.data?.error ?? e?.response?.data?.message ?? fallback;
}
