'use client';

import { useQuery } from '@tanstack/react-query';
import { templatesApi, type NotificationTemplate } from '@/lib/api/templates';

const STALE_MS = 5 * 60 * 1000;

export const templateKeys = {
  all: (orgSlug: string) => ['templates', orgSlug] as const,
  list: (orgSlug: string) => [...templateKeys.all(orgSlug), 'list'] as const,
  detail: (orgSlug: string, id: string, channel: string) => [...templateKeys.all(orgSlug), id, channel] as const,
};

export function useTemplates(orgSlug: string) {
  return useQuery({
    queryKey: templateKeys.list(orgSlug),
    queryFn: () => templatesApi.list(orgSlug),
    enabled: !!orgSlug,
    staleTime: STALE_MS,
  });
}

export function useTemplate(orgSlug: string, id: string, channel: string, enabled = true) {
  return useQuery({
    queryKey: templateKeys.detail(orgSlug, id, channel),
    queryFn: () => templatesApi.get(orgSlug, id, channel),
    enabled: !!orgSlug && !!id && !!channel && enabled,
    staleTime: STALE_MS,
  });
}
