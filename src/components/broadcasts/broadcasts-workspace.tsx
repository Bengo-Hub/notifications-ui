'use client';

import { AnnouncementsPanel } from '@/components/announcements/announcements-panel';
import { useBroadcastSummary } from '@/hooks/use-broadcasts';
import type { SendScope } from '@/lib/api/broadcasts';
import { cn } from '@/lib/utils';
import { CalendarDays, Megaphone, Send } from 'lucide-react';
import { useState } from 'react';
import { BroadcastList } from './broadcast-list';
import { OccasionsPanel } from './occasions-panel';

type Tab = 'messages' | 'occasions' | 'banners';

/**
 * Bulk messages, yearly occasions and (for tenants) dashboard banners, for one sender. The same
 * workspace serves Platform > Broadcasts (the platform messaging its tenants) and Broadcasts in a
 * tenant's own menu (a tenant messaging its customers or staff).
 */
export function BroadcastsWorkspace({ scope, canApprove }: { scope: SendScope; canApprove: boolean }) {
    const [tab, setTab] = useState<Tab>('messages');
    const [openId, setOpenId] = useState<string | null>(null);
    const { data: summary } = useBroadcastSummary(scope);
    const pending = summary?.pending_approval ?? 0;

    const tabs: { key: Tab; label: string; icon: typeof Send }[] = [
        { key: 'messages', label: 'Messages', icon: Send },
        { key: 'occasions', label: 'Occasions', icon: CalendarDays },
        ...(scope === 'tenant' ? [{ key: 'banners' as Tab, label: 'Dashboard banners', icon: Megaphone }] : []),
    ];

    return (
        <div className="space-y-4">
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
            {tab === 'banners' && <AnnouncementsPanel scope="tenant" />}
        </div>
    );
}
