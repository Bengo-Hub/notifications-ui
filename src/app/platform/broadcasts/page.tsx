'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Broadcasts live in one place now (the platform is the platform tenant acting as itself). */
export default function PlatformBroadcastsRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/broadcasts'); }, [router]);
    return null;
}
