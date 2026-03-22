"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useMe } from "@/hooks/useMe";
import { useAuthStore } from "@/store/auth";
import type { Permission, UserRole } from "@/lib/auth/types";
import { userCanAccess } from "@/lib/auth/permissions";

interface RequireAuthProps {
  children: ReactNode;
  roles?: UserRole[];
  permissions?: Permission[];
  roleOperator?: "and" | "or";
  permissionOperator?: "and" | "or";
  redirectTo?: string;
  loadingFallback?: ReactNode;
  denialFallback?: ReactNode;
}

export function RequireAuth({
  children,
  roles,
  permissions,
  roleOperator,
  permissionOperator,
  redirectTo,
  loadingFallback = (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
      Preparing your workspace…
    </div>
  ),
  denialFallback = (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
      You don&apos;t have access to this area.
    </div>
  ),
}: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const storeUser = useAuthStore((state) => state.user);
  const { user: meUser, isLoading: meLoading, isError: meError } = useMe();
  const user = meUser ?? storeUser;

  useEffect(() => {
    if (meError && !pathname?.includes("/auth")) {
      useAuthStore.getState().redirectToSSO(window.location.href);
      return;
    }
    if (status === "authenticated" && user) {
      const accessParams: Parameters<typeof userCanAccess>[1] = {};
      if (roles) accessParams.roles = roles;
      if (permissions) accessParams.permissions = permissions;
      if (roleOperator) accessParams.roleOperator = roleOperator;
      if (permissionOperator) accessParams.permissionOperator = permissionOperator;
      const permitted = userCanAccess(user, accessParams);
      if (!permitted) {
        router.replace(redirectTo ?? "/unauthorized");
      }
      return;
    }

    if ((status === "idle" || status === "error") && !user) {
      useAuthStore.getState().redirectToSSO(window.location.href);
    }
  }, [
    status,
    user,
    roles,
    permissions,
    roleOperator,
    permissionOperator,
    router,
    pathname,
    redirectTo,
    meError,
  ]);

  if (meLoading || status === "loading") {
    return <>{loadingFallback}</>;
  }

  if (!user) {
    return null;
  }

  const accessParams2: Parameters<typeof userCanAccess>[1] = {};
  if (roles) accessParams2.roles = roles;
  if (permissions) accessParams2.permissions = permissions;
  if (roleOperator) accessParams2.roleOperator = roleOperator;
  if (permissionOperator) accessParams2.permissionOperator = permissionOperator;
  const canAccess = userCanAccess(user, accessParams2);
  if (!canAccess) {
    return <>{denialFallback}</>;
  }

  return <>{children}</>;
}
