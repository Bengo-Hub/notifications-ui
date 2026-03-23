'use client';

import { useQuery } from '@tanstack/react-query';
import { templatesApi, type PaginatedResponse, type NotificationTemplate, type TemplateListParams } from '@/lib/api/templates';

// 2 hours stale time — matches backend Redis cache TTL
const STALE_MS = 2 * 60 * 60 * 1000;

export const templateKeys = {
  all: () => ['templates'] as const,
  list: (params?: TemplateListParams) => [...templateKeys.all(), 'list', params ?? {}] as const,
  detail: (id: string, channel: string) => [...templateKeys.all(), id, channel] as const,
};

export function useTemplates(params?: TemplateListParams & { enabled?: boolean }) {
  const { enabled = true, ...listParams } = params ?? {};
  return useQuery<PaginatedResponse<NotificationTemplate>>({
    queryKey: templateKeys.list(listParams),
    queryFn: () => templatesApi.list(listParams),
    staleTime: STALE_MS,
    enabled,
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
