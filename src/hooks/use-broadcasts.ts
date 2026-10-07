'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { broadcastsApi, type BroadcastAction, type BroadcastInput, type OccasionSettings } from '@/lib/api/broadcasts';
import { useTenantFilterStore } from '@/store/tenant-filter';

/**
 * Query keys carry the acting tenant (the switcher pick, if any): the server decides whether a
 * request is the platform's or a tenant's from it, so cached data must never cross that line.
 */
function useActing(): string {
    return useTenantFilterStore((s) => s.selectedTenant?.id) ?? 'self';
}

const keys = {
    all: (acting: string) => ['broadcasts', acting] as const,
    list: (acting: string, params: object) => ['broadcasts', acting, 'list', params] as const,
    one: (acting: string, id: string) => ['broadcasts', acting, 'one', id] as const,
    recipients: (acting: string, id: string, params: object) => ['broadcasts', acting, 'recipients', id, params] as const,
    occasions: (acting: string) => ['broadcasts', acting, 'occasions'] as const,
};

/** Lists poll while anything is sending, so progress moves without a reload. */
export function useBroadcasts(params: { status?: string; limit?: number; offset?: number }) {
    const acting = useActing();
    return useQuery({
        queryKey: keys.list(acting, params),
        queryFn: () => broadcastsApi.list(params),
        placeholderData: keepPreviousData,
        refetchInterval: (q) => (q.state.data?.data.some((b) => b.status === 'sending') ? 5_000 : false),
    });
}

/** Pending approvals, plus who is sending: the platform (to tenants) or a tenant (to customers). */
export function useBroadcastSummary(enabled = true) {
    const acting = useActing();
    return useQuery({
        queryKey: [...keys.all(acting), 'summary'],
        queryFn: () => broadcastsApi.summary(),
        enabled,
        staleTime: 30_000,
    });
}

export function useBroadcast(id: string | null) {
    const acting = useActing();
    return useQuery({
        queryKey: keys.one(acting, id ?? ''),
        queryFn: () => broadcastsApi.get(id!),
        enabled: !!id,
        refetchInterval: (q) => (q.state.data?.broadcast.status === 'sending' ? 5_000 : false),
    });
}

export function useRecipients(id: string, params: { status?: string; channel?: string; limit?: number; offset?: number }) {
    const acting = useActing();
    return useQuery({
        queryKey: keys.recipients(acting, id, params),
        queryFn: () => broadcastsApi.recipients(id, params),
        placeholderData: keepPreviousData,
    });
}

export function useSaveBroadcast() {
    const qc = useQueryClient();
    const acting = useActing();
    return useMutation({
        mutationFn: ({ id, body }: { id?: string; body: BroadcastInput }) =>
            id ? broadcastsApi.update(id, body) : broadcastsApi.create(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(acting) }),
    });
}

export function useBroadcastAction() {
    const qc = useQueryClient();
    const acting = useActing();
    return useMutation({
        mutationFn: ({ id, action, note }: { id: string; action: BroadcastAction; note?: string }) => broadcastsApi.act(id, action, note),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(acting) }),
    });
}

export function useDeleteBroadcast() {
    const qc = useQueryClient();
    const acting = useActing();
    return useMutation({
        mutationFn: (id: string) => broadcastsApi.remove(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(acting) }),
    });
}

export function useEstimate() {
    return useMutation({ mutationFn: (id: string) => broadcastsApi.estimate(id) });
}

export function useWhatsAppTemplates() {
    return useQuery({
        queryKey: ['broadcasts', 'wa-templates'],
        queryFn: async () => (await broadcastsApi.whatsappTemplates()).templates,
        staleTime: 10 * 60_000,
    });
}

export function useOccasions() {
    const acting = useActing();
    return useQuery({
        queryKey: keys.occasions(acting),
        queryFn: async () => (await broadcastsApi.occasions()).data ?? [],
        staleTime: 60_000,
    });
}

export function useSaveOccasion() {
    const qc = useQueryClient();
    const acting = useActing();
    return useMutation({
        mutationFn: ({ key, settings, name, rule }: { key: string; settings?: OccasionSettings; name?: string; rule?: Record<string, unknown> }) =>
            broadcastsApi.saveOccasion(key, { settings, name, rule }),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.occasions(acting) }),
    });
}

export function useDeleteOccasion() {
    const qc = useQueryClient();
    const acting = useActing();
    return useMutation({
        mutationFn: (key: string) => broadcastsApi.deleteOccasion(key),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.occasions(acting) }),
    });
}

export function useDraftOccasion() {
    const qc = useQueryClient();
    const acting = useActing();
    return useMutation({
        mutationFn: (key: string) => broadcastsApi.draftOccasion(key),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(acting) }),
    });
}
