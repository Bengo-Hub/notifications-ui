'use client';

import { BroadcastsWorkspace } from '@/components/broadcasts/broadcasts-workspace';

/** Platform > Broadcasts: the platform's messages and yearly greetings to its tenants. */
export default function PlatformBroadcastsPage() {
    return <BroadcastsWorkspace scope="platform" canApprove />;
}
