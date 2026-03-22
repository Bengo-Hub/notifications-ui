export type UserRole = "viewer" | "manager" | "admin" | "superuser";

export type Permission =
  | "notifications:read"
  | "notifications:send"
  | "notifications:manage"
  | "templates:read"
  | "templates:manage"
  | "templates:test"
  | "providers:read"
  | "providers:manage"
  | "settings:read"
  | "settings:manage"
  | "billing:read"
  | "billing:manage"
  | "analytics:read"
  | "analytics:export"
  | "credits:read"
  | "credits:manage"
  | "users:read"
  | "users:manage"
  | "platform:providers"
  | "platform:billing";

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string | null;
  roles: UserRole[];
  permissions: Permission[];
  tenant_id?: string;
  tenant_slug?: string;
  is_platform_owner?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
