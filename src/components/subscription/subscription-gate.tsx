"use client";

import type { ReactNode } from "react";
import { FeatureLock } from "@bengo-hub/shared-ui-lib/subscription";

interface SubscriptionGateProps {
  feature?: string;
  plan?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * SubscriptionGate — the platform's "show, don't hide" gate.
 *
 * Children are ALWAYS rendered. When a `feature` code is provided and the tenant's plan lacks
 * it, FeatureLock (mode="block") wraps the content with an upgrade CTA that opens the shared
 * UpgradeDialog naming the unlocking tier — never a dead-end replacement or hidden UI.
 *
 * `plan` and `fallback` are kept for call-site compatibility; the shared FeatureLock resolves
 * the required tier from the platform feature catalog, so they are no longer used.
 */
export function SubscriptionGate({ feature, children }: SubscriptionGateProps) {
  if (!feature) return <>{children}</>;
  return (
    <FeatureLock feature={feature} mode="block">
      {children}
    </FeatureLock>
  );
}
