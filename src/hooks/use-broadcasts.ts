'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { broadcastsApi, type BroadcastAction, type BroadcastInput, type OccasionSettings, type SendScope } from '@/lib/api/broadcasts';

const keys = {
    all: (scope: SendScope) => ['broadcasts', scope] as const,
    list: (scope: SendScope, params: object) => ['broadcasts', scope, 'list', params] as const,
    one: (scope: SendScope, id: string) => ['broadcasts', scope, 'one', id] as const,
    recipients: (scope: SendScope, id: string, params: object) => ['broadcasts', scope, 'recipients', id, params] as const,
    occasions: (scope: SendScope) => ['broadcasts', scope, 'occasions'] as const,
};

/** Lists poll while anything is sending, so progress moves without a reload. */
export function useBroadcasts(scope: SendScope, params: { status?: string; limit?: number; offset?: number }) {
    return useQuery({
        queryKey: keys.list(scope, params),
        queryFn: () => broadcastsApi.list(scope, params),
        placeholderData: keepPreviousData,
        refetchInterval: (q) => (q.state.data?.data.some((b) => b.status === 'sending') ? 5_000 : false),
    });
}

export function useBroadcastSummary(scope: SendScope, enabled = true) {
    return useQuery({
        queryKey: [...keys.all(scope), 'summary'],
        queryFn: () => broadcastsApi.summary(scope),
        enabled,
        staleTime: 30_000,
    });
}

export function useBroadcast(scope: SendScope, id: string | null) {
    return useQuery({
        queryKey: keys.one(scope, id ?? ''),
        queryFn: () => broadcastsApi.get(scope, id!),
        enabled: !!id,
        refetchInterval: (q) => (q.state.data?.broadcast.status === 'sending' ? 5_000 : false),
    });
}

export function useRecipients(scope: SendScope, id: string, params: { status?: string; channel?: string; limit?: number; offset?: number }) {
    return useQuery({
        queryKey: keys.recipients(scope, id, params),
        queryFn: () => broadcastsApi.recipients(scope, id, params),
        placeholderData: keepPreviousData,
    });
}

export function useSaveBroadcast(scope: SendScope) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: string; body: BroadcastInput }) =>
            id ? broadcastsApi.update(scope, id, body) : broadcastsApi.create(scope, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(scope) }),
    });
}

export function useBroadcastAction(scope: SendScope) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, action, note }: { id: string; action: BroadcastAction; note?: string }) => broadcastsApi.act(scope, id, action, note),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(scope) }),
    });
}

export function useDeleteBroadcast(scope: SendScope) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => broadcastsApi.remove(scope, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(scope) }),
    });
}

export function useEstimate(scope: SendScope) {
    return useMutation({ mutationFn: (id: string) => broadcastsApi.estimate(scope, id) });
}

export function useWhatsAppTemplates(scope: SendScope) {
    return useQuery({
        queryKey: [...keys.all(scope), 'wa-templates'],
        queryFn: async () => (await broadcastsApi.whatsappTemplates(scope)).templates,
        staleTime: 10 * 60_000,
    });
}

export function useOccasions(scope: SendScope) {
    return useQuery({
        queryKey: keys.occasions(scope),
        queryFn: async () => (await broadcastsApi.occasions(scope)).data ?? [],
        staleTime: 60_000,
    });
}

export function useSaveOccasion(scope: SendScope) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ key, settings, name, rule }: { key: string; settings?: OccasionSettings; name?: string; rule?: Record<string, unknown> }) =>
            broadcastsApi.saveOccasion(scope, key, { settings, name, rule }),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.occasions(scope) }),
    });
}

export function useDeleteOccasion(scope: SendScope) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (key: string) => broadcastsApi.deleteOccasion(scope, key),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.occasions(scope) }),
    });
}

export function useDraftOccasion(scope: SendScope) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (key: string) => broadcastsApi.draftOccasion(scope, key),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(scope) }),
    });
}
