export type UserRole = "staff" | "admin" | "superuser";

export type Permission =
  // Notification permissions
  | "notifications.notifications.add"
  | "notifications.notifications.view"
  | "notifications.notifications.view_own"
  | "notifications.notifications.change"
  | "notifications.notifications.change_own"
  | "notifications.notifications.delete"
  | "notifications.notifications.delete_own"
  | "notifications.notifications.manage"
  | "notifications.notifications.manage_own"
  // Template permissions
  | "notifications.templates.add"
  | "notifications.templates.view"
  | "notifications.templates.change"
  | "notifications.templates.delete"
  | "notifications.templates.manage"
  // Provider permissions
  | "notifications.providers.add"
  | "notifications.providers.view"
  | "notifications.providers.change"
  | "notifications.providers.delete"
  | "notifications.providers.manage"
  // Configuration permissions
  | "notifications.config.view"
  | "notifications.config.manage"
  // User management
  | "notifications.users.manage";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  permissions: Permission[];
  organizationId: string;
  tenantId: string;
  tenantSlug: string;
  isPlatformOwner?: boolean;
  isSuperUser?: boolean;
}
