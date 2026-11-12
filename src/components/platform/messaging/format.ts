import type { AdminCreditService, AdminTenantStatus } from '@/lib/api/credits-admin';

// WhatsApp categories by their plain names (never Meta's category words alone).
export const SERVICE_LABEL: Record<AdminCreditService, string> = {
    sms: 'SMS',
    whatsapp_marketing: 'WhatsApp promotions',
    whatsapp_utility: 'WhatsApp order and account updates',
    whatsapp_authentication: 'WhatsApp login codes',
    whatsapp_service: 'WhatsApp replies',
};

export const SERVICES: AdminCreditService[] = [
    'sms',
    'whatsapp_marketing',
    'whatsapp_utility',
    'whatsapp_authentication',
    'whatsapp_service',
];

export const STATUS_LABEL: Record<AdminTenantStatus, string> = {
    active: 'Active',
    capped: 'Capped',
    not_activated: 'Not activated',
    exempt: 'Exempt',
};

export const STATUS_BADGE: Record<AdminTenantStatus, 'success' | 'error' | 'warning' | 'outline'> = {
    active: 'success',
    capped: 'error',
    not_activated: 'warning',
    exempt: 'outline',
};

export function fmtKes(n: number): string {
    return `KES ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function fmtUnits(n: number): string {
    return n.toLocaleString();
}

export function fmtDate(iso?: string, fallback = 'Never'): string {
    if (!iso) return fallback;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? fallback : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/** Share of the cap used, 0 to 100. A cap of zero means no cap, so there is nothing to fill. */
export function capPercent(pending: number, cap: number): number {
    if (cap <= 0) return 0;
    return Math.max(0, Math.min(100, (pending / cap) * 100));
}
