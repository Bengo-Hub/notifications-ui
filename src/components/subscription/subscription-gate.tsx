"use client";

import type { ReactNode } from "react";

interface SubscriptionGateProps {
  feature?: string;
  plan?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

// Notifications-service is a core platform service — subscription gating does not apply.
// All features are available to all tenants. This component is a no-op passthrough.
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  return <>{children}</>;
}
