'use client';

import { BroadcastsWorkspace } from '@/components/broadcasts/broadcasts-workspace';
import { useMe } from '@/hooks/useMe';
import { isPlatformOwnerOrSuperuser } from '@/lib/auth/permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Broadcasts for the acting tenant: greetings, offers and notices to its customers or staff. */
export default function BroadcastsPage() {
    const { user, hasPermission } = useMe();
    const router = useRouter();
    const isOwner = isPlatformOwnerOrSuperuser(user ?? null);
    const allowed = isOwner || hasPermission('notifications.broadcasts.manage');

    useEffect(() => {
        if (user && !allowed) router.replace('/unauthorized');
    }, [user, allowed, router]);

    if (!user || !allowed) return null;

    return (
        <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Broadcasts</h1>
                <p className="text-muted-foreground mt-1">Messages to your customers and staff, yearly greetings, and dashboard banners.</p>
            </div>
            <BroadcastsWorkspace scope="tenant" canApprove={isOwner || hasPermission('notifications.broadcasts.approve')} />
        </div>
    );
}
