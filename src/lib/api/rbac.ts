import { apiClient } from './client';

// NOTE: these RBAC model structs have no json tags on the Go side, so encoding/json
// serializes them using the exported field names verbatim (PascalCase) — unlike the
// rest of this API, which uses snake_case. Match the wire shape exactly here.
export interface NotificationRole {
    ID: string;
    TenantID?: string | null;
    RoleCode: string;
    Name: string;
    Description?: string | null;
    IsSystemRole: boolean;
    CreatedAt: string;
    UpdatedAt: string;
}

export interface NotificationPermission {
    ID: string;
    PermissionCode: string;
    Name: string;
    Module: string;
    Action: string;
    Resource?: string | null;
    Description?: string | null;
    CreatedAt: string;
}

export interface UserRoleAssignment {
    ID: string;
    TenantID: string;
    UserID: string;
    RoleID: string;
    AssignedBy: string;
    AssignedAt: string;
    ExpiresAt?: string | null;
}

export interface TenantUser {
    id: string;
    email: string;
    full_name: string;
}

export const rbacApi = {
    listRoles: () =>
        apiClient.get<{ roles: NotificationRole[] }>('/api/v1/rbac/roles'),

    listTenantUsers: () =>
        apiClient.get<{ users: TenantUser[] }>('/api/v1/rbac/users'),

    listPermissions: (params?: { module?: string; action?: string }) => {
        const q = new URLSearchParams();
        if (params?.module) q.set('module', params.module);
        if (params?.action) q.set('action', params.action);
        const qs = q.toString();
        return apiClient.get<{ permissions: NotificationPermission[] }>(`/api/v1/rbac/permissions${qs ? `?${qs}` : ''}`);
    },

    listAssignments: () =>
        apiClient.get<{ assignments: UserRoleAssignment[] }>('/api/v1/rbac/assignments'),

    assignRole: (body: { user_id: string; role_id: string }) =>
        apiClient.post<{ message: string }>('/api/v1/rbac/assignments', body),

    revokeRole: (assignmentId: string) =>
        apiClient.delete<{ message: string }>(`/api/v1/rbac/assignments/${assignmentId}`),

    getUserRoles: (userId: string) =>
        apiClient.get<{ roles: NotificationRole[] }>(`/api/v1/rbac/users/${userId}/roles`),

    getUserPermissions: (userId: string) =>
        apiClient.get<{ permissions: NotificationPermission[] }>(`/api/v1/rbac/users/${userId}/permissions`),
};
