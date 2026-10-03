'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsApi, type AnnouncementInput } from '@/lib/api/announcements';

const KEY = ['platform', 'announcements'] as const;

export function useAnnouncements() {
    return useQuery({
        queryKey: KEY,
        queryFn: async () => (await announcementsApi.list()).announcements ?? [],
        staleTime: 30_000,
    });
}

export function useSaveAnnouncement() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: string; body: AnnouncementInput }) =>
            id ? announcementsApi.update(id, body) : announcementsApi.create(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export function useDeleteAnnouncement() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => announcementsApi.remove(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}
