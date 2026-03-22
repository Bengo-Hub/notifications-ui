package identity

import "errors"

var (
	// ErrUserNotFound indicates that the requested user could not be located.
	ErrUserNotFound = errors.New("identity: user not found")

	// ErrRoleNotPermitted indicates a role-based access denial.
	ErrRoleNotPermitted = errors.New("identity: role not permitted")

	// ErrInvalidPermission indicates a permission-based access denial.
	ErrInvalidPermission = errors.New("identity: insufficient permissions")
)
