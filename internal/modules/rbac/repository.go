package rbac

import (
	"context"

	"github.com/google/uuid"
)

// Repository abstracts persistence for RBAC entities.
type Repository interface {
	// Role operations
	CreateRole(ctx context.Context, tenantID uuid.UUID, role *NotificationRole) error
	GetRole(ctx context.Context, tenantID uuid.UUID, roleID uuid.UUID) (*NotificationRole, error)
	GetRoleByCode(ctx context.Context, tenantID uuid.UUID, roleCode string) (*NotificationRole, error)
	ListRoles(ctx context.Context, tenantID uuid.UUID) ([]*NotificationRole, error)

	// Permission operations
	CreatePermission(ctx context.Context, permission *NotificationPermission) error
	GetPermission(ctx context.Context, permissionID uuid.UUID) (*NotificationPermission, error)
	GetPermissionByCode(ctx context.Context, permissionCode string) (*NotificationPermission, error)
	ListPermissions(ctx context.Context, filters PermissionFilters) ([]*NotificationPermission, error)

	// Role-Permission operations
	AssignPermissionToRole(ctx context.Context, roleID uuid.UUID, permissionID uuid.UUID) error
	RemovePermissionFromRole(ctx context.Context, roleID uuid.UUID, permissionID uuid.UUID) error
	GetRolePermissions(ctx context.Context, roleID uuid.UUID) ([]*NotificationPermission, error)

	// User-Role assignment operations
	AssignRoleToUser(ctx context.Context, tenantID uuid.UUID, assignment *UserRoleAssignment) error
	RevokeRoleFromUser(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, roleID uuid.UUID) error
	GetUserRoles(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) ([]*NotificationRole, error)
	GetUserPermissions(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) ([]*NotificationPermission, error)
	ListUserAssignments(ctx context.Context, tenantID uuid.UUID, filters AssignmentFilters) ([]*UserRoleAssignment, error)
}

// PermissionFilters for listing permissions.
type PermissionFilters struct {
	Module *string
	Action *string
}

// AssignmentFilters for listing role assignments.
type AssignmentFilters struct {
	UserID *uuid.UUID
	RoleID *uuid.UUID
}
