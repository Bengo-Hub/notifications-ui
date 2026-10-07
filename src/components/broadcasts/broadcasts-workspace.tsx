'use client';

import { AnnouncementsPanel } from '@/components/announcements/announcements-panel';
import { useBroadcastSummary } from '@/hooks/use-broadcasts';
import { cn } from '@/lib/utils';
import { CalendarDays, Loader2, Megaphone, Send } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BroadcastList } from './broadcast-list';
import { OccasionsPanel } from './occasions-panel';

type Tab = 'messages' | 'occasions' | 'banners';
const TABS: Tab[] = ['messages', 'occasions', 'banners'];

/**
 * Bulk messages, yearly occasions and dashboard banners for whoever is sending. The server
 * decides who that is from the acting tenant: the platform tenant acting as itself is the
 * platform (messages and banners reach every tenant); any other tenant, including one a platform
 * owner picked in the switcher, reaches its own customers and staff. One page, one set of data.
 */
export function BroadcastsWorkspace({ canApprove }: { canApprove: boolean }) {
    const params = useSearchParams();
    const initial = params.get('tab') as Tab | null;
    const [tab, setTab] = useState<Tab>(initial && TABS.includes(initial) ? initial : 'messages');
    const [openId, setOpenId] = useState<string | null>(null);
    const { data: summary, isLoading } = useBroadcastSummary();

    if (isLoading || !summary) {
        return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
    }
    const scope = summary.scope;
    const pending = summary.pending_approval ?? 0;

    const tabs: { key: Tab; label: string; icon: typeof Send }[] = [
        { key: 'messages', label: 'Messages', icon: Send },
        { key: 'occasions', label: 'Occasions', icon: CalendarDays },
        { key: 'banners', label: scope === 'platform' ? 'Announcements' : 'Dashboard banners', icon: Megaphone },
    ];

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                {scope === 'platform'
                    ? <>Sending as <span className="font-semibold text-foreground">{summary.sender_name}</span> to every tenant. Pick a tenant in the switcher to send as that tenant to its own customers.</>
                    : <>Sending as <span className="font-semibold text-foreground">{summary.sender_name}</span> to its customers and staff.</>}
            </p>
            <div className="flex gap-1 overflow-x-auto border-b border-border">
                {tabs.map((t) => {
                    const Icon = t.icon;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={cn('flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium -mb-px transition-colors',
                                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                            <Icon className="h-4 w-4" /> {t.label}
                            {t.key === 'messages' && pending > 0 && (
                                <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{pending}</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {pending > 0 && tab === 'messages' && canApprove && (
                <p className="rounded-lg border border-border bg-accent/20 p-3 text-sm">
                    {pending === 1 ? '1 message is' : `${pending} messages are`} waiting for your approval.
                </p>
            )}
            {tab === 'messages' && <BroadcastList scope={scope} canApprove={canApprove} openId={openId} onOpen={setOpenId} />}
            {tab === 'occasions' && <OccasionsPanel scope={scope} onOpenBroadcast={(id) => { setTab('messages'); setOpenId(id); }} />}
            {tab === 'banners' && <AnnouncementsPanel scope={scope} />}
        </div>
    );
}
