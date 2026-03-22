'use client';

import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '@/lib/api/templates';

const STALE_MS = 5 * 60 * 1000;

export const templateKeys = {
  all: () => ['templates'] as const,
  list: () => [...templateKeys.all(), 'list'] as const,
  detail: (id: string, channel: string) => [...templateKeys.all(), id, channel] as const,
};

export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: () => templatesApi.list(),
    staleTime: STALE_MS,
  });
}

export function useTemplate(id: string, channel: string, enabled = true) {
  return useQuery({
    queryKey: templateKeys.detail(id, channel),
    queryFn: () => templatesApi.get(id, channel),
    enabled: !!id && !!channel && enabled,
    staleTime: STALE_MS,
  });
}
