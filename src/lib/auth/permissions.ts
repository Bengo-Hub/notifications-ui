import type { Permission, UserRole } from "./types";

type Operator = "and" | "or";

/** A user-like object with roles and permissions arrays. */
interface UserWithAuth {
  roles: (string | UserRole)[];
  permissions: (string | Permission)[];
}

export function userHasRole(
  user: UserWithAuth | null | undefined,
  roles?: UserRole[] | null,
  operator: Operator = "or",
): boolean {
  if (!roles?.length) return true;
  if (!user) return false;
  const matches = roles.map((role) => user.roles.includes(role));
  return operator === "and" ? matches.every(Boolean) : matches.some(Boolean);
}

export function userHasPermission(
  user: UserWithAuth | null | undefined,
  permissions?: Permission[] | null,
  operator: Operator = "or",
): boolean {
  if (!permissions?.length) return true;
  if (!user) return false;
  const matches = permissions.map((permission) => user.permissions.includes(permission));
  return operator === "and" ? matches.every(Boolean) : matches.some(Boolean);
}

export function userCanAccess(
  user: UserWithAuth | null | undefined,
  options: {
    roles?: UserRole[] | null;
    permissions?: Permission[] | null;
    roleOperator?: Operator;
    permissionOperator?: Operator;
  } = {},
): boolean {
  const { roles, permissions, roleOperator = "or", permissionOperator = "or" } = options;
  return (
    userHasRole(user, roles, roleOperator) &&
    userHasPermission(user, permissions, permissionOperator)
  );
}
