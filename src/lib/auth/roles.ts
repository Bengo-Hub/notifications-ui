/**
 * Re-exports from permissions module for backward compatibility.
 * Prefer importing from @/lib/auth/permissions and @/lib/auth/types directly.
 */

import type { Permission, UserProfile, UserRole } from "./types";
import { userHasRole, userHasPermission } from "./permissions";

export type { UserRole, Permission, UserProfile };

export interface UserWithRole {
  role?: string;
  roles?: string[];
}

export function hasRole(
  user: UserWithRole | null | undefined,
  role: string,
): boolean {
  if (!user) return false;
  if ((user as { role?: string }).role === role) return true;
  return (
    Array.isArray((user as { roles?: string[] }).roles) &&
    (user as { roles: string[] }).roles.includes(role)
  );
}

export interface UserWithPermissions {
  permissions?: string[];
}

export function hasPermission(
  user: UserWithPermissions | null | undefined,
  permission: string,
): boolean {
  if (!user?.permissions || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(permission);
}

/** Platform routes (e.g. /platform) require admin or superuser. */
export function canAccessPlatform(
  user: (UserWithRole & UserWithPermissions) | null | undefined,
): boolean {
  if (!user) return false;
  return hasRole(user, "admin") || hasRole(user, "superuser");
}

export { userHasRole, userHasPermission };
