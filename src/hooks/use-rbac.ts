'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/lib/api/rbac';

const STALE_MS = 60 * 1000;

export const rbacKeys = {
    roles: () => ['rbac', 'roles'] as const,
    permissions: () => ['rbac', 'permissions'] as const,
    assignments: () => ['rbac', 'assignments'] as const,
};

export function useTenantUsers() {
    return useQuery({
        queryKey: ['rbac', 'users'] as const,
        queryFn: async () => (await rbacApi.listTenantUsers()).users,
        staleTime: STALE_MS,
    });
}

export function useRoles() {
    return useQuery({
        queryKey: rbacKeys.roles(),
        queryFn: async () => (await rbacApi.listRoles()).roles,
        staleTime: STALE_MS,
    });
}

export function usePermissions() {
    return useQuery({
        queryKey: rbacKeys.permissions(),
        queryFn: async () => (await rbacApi.listPermissions()).permissions,
        staleTime: STALE_MS,
    });
}

export function useAssignments() {
    return useQuery({
        queryKey: rbacKeys.assignments(),
        queryFn: async () => (await rbacApi.listAssignments()).assignments,
        staleTime: STALE_MS,
    });
}

export function useAssignRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: { user_id: string; role_id: string }) => rbacApi.assignRole(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: rbacKeys.assignments() }),
    });
}

export function useRevokeRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (assignmentId: string) => rbacApi.revokeRole(assignmentId),
        onSuccess: () => qc.invalidateQueries({ queryKey: rbacKeys.assignments() }),
    });
}
