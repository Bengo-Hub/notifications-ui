'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsApi, type AnnouncementInput, type BannerScope } from '@/lib/api/announcements';

const key = (scope: BannerScope) => ['announcements', scope] as const;

export function useAnnouncements(scope: BannerScope = 'platform') {
    return useQuery({
        queryKey: key(scope),
        queryFn: async () => (await announcementsApi.list(scope)).announcements ?? [],
        staleTime: 30_000,
    });
}

export function useSaveAnnouncement(scope: BannerScope = 'platform') {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: string; body: AnnouncementInput }) =>
            id ? announcementsApi.update(id, body, scope) : announcementsApi.create(body, scope),
        onSuccess: () => qc.invalidateQueries({ queryKey: key(scope) }),
    });
}

export function useDeleteAnnouncement(scope: BannerScope = 'platform') {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => announcementsApi.remove(id, scope),
        onSuccess: () => qc.invalidateQueries({ queryKey: key(scope) }),
    });
}
