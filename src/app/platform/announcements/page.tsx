'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Platform announcements are the Announcements tab of Broadcasts (one list, one place). */
export default function PlatformAnnouncementsRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/broadcasts?tab=banners'); }, [router]);
    return null;
}
