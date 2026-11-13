'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { whatsappCostsApi, type WhatsAppCostReport } from '@/lib/api/whatsapp-costs';

// The API caches each range for an hour, so there is no point asking again sooner.
const STALE_MS = 10 * 60 * 1000;

export function useWhatsAppCosts(from: string, to: string, enabled = true) {
    return useQuery<WhatsAppCostReport>({
        queryKey: ['platform', 'whatsapp-costs', from, to],
        queryFn: () => whatsappCostsApi.get(from, to),
        staleTime: STALE_MS,
        placeholderData: keepPreviousData,
        enabled: enabled && !!from && !!to,
    });
}
