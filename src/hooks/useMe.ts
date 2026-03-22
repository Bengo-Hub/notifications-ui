'use client';

import { fetchProfile } from '@/lib/auth/api';
import { apiClient } from '@/lib/api/client';
import type { Permission, UserProfile, UserRole } from '@/lib/auth/types';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';

const ME_STALE_TIME_MS = 5 * 60 * 1000; // 5 min TTL

/**
 * Fetch service-level roles and permissions from notifications-api /auth/me.
 * Merges with SSO profile to provide combined authorization context.
 */
async function fetchServiceProfile(): Promise<{ roles: string[]; permissions: string[] } | null> {
  try {
    return await apiClient.get<{ roles: string[]; permissions: string[] }>('/api/v1/auth/me');
  } catch {
    // Service-level /auth/me may 404 if user not yet JIT-provisioned; fall back gracefully
    return null;
  }
}

export function useMe() {
  const { session, setUser } = useAuthStore();
  const accessToken = session?.accessToken ?? null;

  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      if (!accessToken) return null;

      // Step 1: SSO profile (source of truth for identity)
      const user = await fetchProfile(accessToken);

      // Step 2: Service-level permissions (notifications RBAC)
      const svcProfile = await fetchServiceProfile();
      if (svcProfile) {
        // Merge service-level roles and permissions (deduplicated)
        const mergedRoles = [...new Set([...user.roles, ...(svcProfile.roles ?? [])])] as UserRole[];
        const mergedPermissions = [...new Set([...user.permissions, ...(svcProfile.permissions ?? [])])] as Permission[];
        user.roles = mergedRoles;
        user.permissions = mergedPermissions;
      }

      setUser(user as UserProfile);
      return user as UserProfile;
    },
    enabled: !!accessToken,
    staleTime: ME_STALE_TIME_MS,
    gcTime: ME_STALE_TIME_MS * 2,
    retry: (failureCount: number, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });

  const user = query.data ?? useAuthStore.getState().user;

  const hasRole = (role: string) => {
    if (!user?.roles) return false;
    if (user.isSuperUser || user.roles.includes('superuser')) return true;
    return user.roles.includes(role as UserRole);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.isSuperUser || user.roles?.includes('superuser')) return true;
    return user.permissions?.includes(permission as Permission) ?? false;
  };

  return {
    user,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasRole,
    hasPermission,
    isAuthenticated: !!user,
  };
}
