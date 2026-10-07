'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsApi, type AnnouncementInput } from '@/lib/api/announcements';
import { useTenantFilterStore } from '@/store/tenant-filter';

/** Keyed by the acting tenant: the server decides whose banners these are from it. */
function useKey() {
    const acting = useTenantFilterStore((s) => s.selectedTenant?.id) ?? 'self';
    return ['announcements', acting] as const;
}

export function useAnnouncements() {
    const key = useKey();
    return useQuery({
        queryKey: key,
        queryFn: async () => (await announcementsApi.list()).announcements ?? [],
        staleTime: 30_000,
    });
}

export function useSaveAnnouncement() {
    const qc = useQueryClient();
    const key = useKey();
    return useMutation({
        mutationFn: ({ id, body }: { id?: string; body: AnnouncementInput }) =>
            id ? announcementsApi.update(id, body) : announcementsApi.create(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
}

export function useDeleteAnnouncement() {
    const qc = useQueryClient();
    const key = useKey();
    return useMutation({
        mutationFn: (id: string) => announcementsApi.remove(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
}
