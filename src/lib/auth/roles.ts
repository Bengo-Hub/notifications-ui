/** RBAC helpers: use with user from useMe (roles + permissions from auth-api GET /me). */

export interface UserWithRole {
  role?: string;
  roles?: string[];
}

export function hasRole(
  user: UserWithRole | null | undefined,
  role: string
): boolean {
  if (!user) return false;
  if ((user as { role?: string }).role === role) return true;
  return Array.isArray((user as { roles?: string[] }).roles) && (user as { roles: string[] }).roles.includes(role);
}

export interface UserWithPermissions {
  permissions?: string[];
}

export function hasPermission(
  user: UserWithPermissions | null | undefined,
  permission: string
): boolean {
  if (!user?.permissions || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(permission);
}

/** Platform routes (e.g. /platform) require admin or super_admin. */
export function canAccessPlatform(user: (UserWithRole & UserWithPermissions) | null | undefined): boolean {
  if (!user) return false;
  return hasRole(user, 'admin') || hasRole(user, 'super_admin');
}
