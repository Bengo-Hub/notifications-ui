'use client';

import { AnnouncementsPanel } from '@/components/announcements/announcements-panel';

/** Platform > Announcements: the "what's new" banners every tenant's apps show on their dashboards. */
export default function AnnouncementsPage() {
    return <AnnouncementsPanel scope="platform" />;
}
