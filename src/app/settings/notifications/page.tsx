'use client';

import { Card, CardContent } from '@/components/ui/base';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { Bell, Globe2, Mail, MessageCircle, MessageSquare, RefreshCw, RotateCcw, Search, Smartphone } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, cellText, compareValues, type FilterMap, type SortState } from '@bengo-hub/shared-ui-lib/data-table';
import type { NotificationPreference, PreferenceScope } from '@/lib/api/settings';
import { useMe } from '@/hooks/useMe';
import { isPlatformOwnerOrSuperuser } from '@/lib/auth/permissions';
import {
    useNotificationPreferences,
    useResetNotificationPreference,
    useUpdateNotificationPreference,
} from '@/hooks/use-notification-preferences';
import { buildNotificationPreferenceColumns } from './notification-preferences-columns';
import { ChannelSelectionModal } from './channel-selection-modal';

type ChannelFilter = 'all' | 'email' | 'sms' | 'whatsapp' | 'push';

const CHANNEL_TABS: { value: ChannelFilter; label: string; icon: typeof Bell }[] = [
    { value: 'all', label: 'All', icon: Bell },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: MessageSquare },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'push', label: 'Push', icon: Smartphone },
];

export default function NotificationPreferencesPage() {
    const { user } = useMe();
    const isOwner = isPlatformOwnerOrSuperuser(user ?? null);
    // Platform owners can switch to the platform defaults every tenant inherits.
    const [scope, setScope] = useState<PreferenceScope>('tenant');
    const activeScope: PreferenceScope = isOwner ? scope : 'tenant';
    const { data, isLoading, isError, refetch } = useNotificationPreferences(activeScope);
    const update = useUpdateNotificationPreference(activeScope);
    const resetPref = useResetNotificationPreference(activeScope);
    const { confirm, dialog } = useConfirm();
    const [channel, setChannel] = useState<ChannelFilter>('all');
    const [search, setSearch] = useState('');
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    const [resettingKey, setResettingKey] = useState<string | null>(null);
    const [editingPref, setEditingPref] = useState<NotificationPreference | null>(null);
    const [pageSize, setPageSize] = useState(15);
    const [pageState, setPageState] = useState<{ view: string; page: number }>({ view: '', page: 1 });

    // Defensive: normalize array fields to [] even if a stale cached response (or a backend
    // hiccup) ever serializes one as null — every consumer below iterates/joins/includes()'s
    // these fields unconditionally.
    const rows = useMemo(
        () => (data?.data ?? []).map((p) => ({
            ...p,
            channels: p.channels ?? [],
            enabledChannels: p.enabledChannels ?? p.channels ?? [],
        })),
        [data]
    );

    const counts = useMemo(() => {
        const c: Record<ChannelFilter, number> = { all: rows.length, email: 0, sms: 0, whatsapp: 0, push: 0 };
        for (const p of rows) {
            for (const ch of p.channels) {
                if (ch in c) c[ch as ChannelFilter]++;
            }
        }
        return c;
    }, [rows]);

    // DataTable's own funnel-filter/sort state, taken over (controlled) rather than left
    // internal — the shared component only ever paginates the rows it's handed, so once this
    // page needs real pagination (see below), the host has to run the exact same funnel/sort
    // pass DataTable normally does internally BEFORE slicing to a page, or a search/sort
    // interacting with the channel tabs would silently only ever see the current page's rows.
    const [filters, setFilters] = useState<FilterMap>({});
    const [sort, setSort] = useState<SortState | null>(null);

    const handleToggle = useCallback(async (pref: NotificationPreference, enabled: boolean) => {
        setPendingKey(pref.key);
        try {
            await update.mutateAsync({ key: pref.key, enabled });
            toast.success(`${pref.label} ${enabled ? 'enabled' : 'disabled'}`);
        } catch {
            toast.error(`Failed to update ${pref.label}`);
        } finally {
            setPendingKey(null);
        }
    }, [update]);

    const handleSaveChannels = useCallback(async (key: string, channels: string[]) => {
        const pref = rows.find((p) => p.key === key);
        try {
            await update.mutateAsync({ key, channels });
            toast.success(`${pref?.label ?? key} channels updated`);
            setEditingPref(null);
        } catch {
            toast.error(`Failed to update ${pref?.label ?? key} channels`);
        }
    }, [update, rows]);

    const handleReset = useCallback(async (pref: NotificationPreference) => {
        setResettingKey(pref.key);
        try {
            await resetPref.mutateAsync(pref.key);
            toast.success(`${pref.label} reset to default`);
        } catch {
            toast.error(`Failed to reset ${pref.label}`);
        } finally {
            setResettingKey(null);
        }
    }, [resetPref]);

    const groupOptions = useMemo(
        () => [...new Set(rows.map((p) => p.group))].sort(),
        [rows]
    );

    const columns = useMemo(
        () => buildNotificationPreferenceColumns(handleToggle, pendingKey, groupOptions, setEditingPref, handleReset, resettingKey),
        [handleToggle, pendingKey, groupOptions, handleReset, resettingKey]
    );

    const filtered = useMemo(() => {
        let out = channel === 'all' ? rows : rows.filter((p) => p.channels.includes(channel));

        // Free-text search over the label, the template key (e.g. billing/provider_balance_low)
        // and the group, so any notification can be found by the name its template carries.
        const q = search.trim().toLowerCase();
        if (q) {
            out = out.filter((p) => `${p.label} ${p.key} ${p.group}`.toLowerCase().includes(q));
        }

        // Mirrors DataTable's own internal funnel-filter matching exactly (values-checklist +
        // free-text query per column), reusing its exported cellText so this can't drift from
        // what the funnel icon's checklist/search box actually promises.
        const active = Object.entries(filters).filter(([, st]) => st && ((st.values?.length ?? 0) > 0 || st.query?.trim()));
        if (active.length > 0) {
            out = out.filter((row) =>
                active.every(([key, st]) => {
                    const col = columns.find((c) => c.key === key);
                    if (!col) return true;
                    const text = cellText((col.accessor ?? ((r: NotificationPreference) => (r as unknown as Record<string, unknown>)[key]))(row));
                    if (st.values?.length && !st.values.includes(text)) return false;
                    if (st.query?.trim() && !text.toLowerCase().includes(st.query.trim().toLowerCase())) return false;
                    return true;
                })
            );
        }

        if (sort) {
            const col = columns.find((c) => c.key === sort.key);
            if (col) {
                const acc = col.accessor ?? ((r: NotificationPreference) => (r as unknown as Record<string, unknown>)[sort.key]);
                out = [...out].sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * compareValues(acc(a), acc(b)));
            }
        }

        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `columns` is stable per [handleToggle, pendingKey, groupOptions] and re-declaring it here would just re-derive the same array on every filtered/sort computation
    }, [rows, channel, filters, sort, search]);

    // The shared DataTable only slices/paginates rows when the host drives page state itself
    // (its footer renders solely off page/totalPages/onPageChange) — without this, "Show N
    // entries" is decorative and every row renders in one continuous list, which is also why
    // switching channel tabs looked like a no-op: the top of an unpaginated list barely changes
    // when only later rows get filtered out. Reset to page 1 whenever the visible set changes
    // shape so a filter/page-size change can never strand the view on a now-empty page.
    // The page is remembered per view: a new filter, sort, size, search or scope starts at page 1.
    const viewKey = JSON.stringify([channel, filters, sort, pageSize, search, activeScope]);
    const page = pageState.view === viewKey ? pageState.page : 1;
    const setPage = useCallback((p: number) => setPageState({ view: viewKey, page: p }), [viewKey]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = useMemo(
        () => filtered.slice((page - 1) * pageSize, page * pageSize),
        [filtered, page, pageSize]
    );

    const overriddenKeys = useMemo(
        () => rows.filter((p) => p.overridden || p.channelsOverridden).map((p) => p.key),
        [rows]
    );

    const handleResetAll = async () => {
        if (overriddenKeys.length === 0) return;
        const { ok } = await confirm({
            title: 'Reset to defaults?',
            description: `All ${overriddenKeys.length} customized notification(s) go back to their default settings.`,
            confirmLabel: 'Reset all',
        });
        if (!ok) return;
        try {
            await Promise.all(overriddenKeys.map((key) => resetPref.mutateAsync(key)));
            toast.success('All customizations reset to defaults');
        } catch {
            toast.error('Some notifications failed to reset — try again');
        }
    };

    return (
        <div className="space-y-6">
            {dialog}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" /> Notification Preferences
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                        {activeScope === 'platform'
                            ? 'Platform defaults: what every organization gets until it changes a notification itself. Switching a notification or one of its channels off here stops it for every organization that has not set its own choice.'
                            : 'Choose which notifications this organization sends and on which channels. A notification or channel you switch off is not sent until you switch it back on. Security-critical messages (password resets, one-time codes) are always delivered.'}
                    </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    {isOwner && (
                        <button
                            type="button"
                            onClick={() => setScope(activeScope === 'platform' ? 'tenant' : 'platform')}
                            aria-pressed={activeScope === 'platform'}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                activeScope === 'platform'
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'text-muted-foreground border-border hover:text-foreground'
                            )}
                        >
                            <Globe2 className="h-3.5 w-3.5" /> Platform defaults
                        </button>
                    )}
                    {overriddenKeys.length > 0 && (
                        <button
                            onClick={handleResetAll}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset all ({overriddenKeys.length})
                        </button>
                    )}
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or template, e.g. provider_balance_low"
                    aria-label="Search notifications"
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {CHANNEL_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = channel === tab.value;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setChannel(tab.value)}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors',
                                active
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                            <span className={cn('text-[10px] font-bold', active ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                                {counts[tab.value]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {isError ? (
                <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        Failed to load notification preferences.{' '}
                        <button onClick={() => refetch()} className="text-primary hover:underline">Retry</button>
                    </CardContent>
                </Card>
            ) : (
                <DataTable
                    columns={columns}
                    rows={paginated}
                    rowKey={(p) => p.key}
                    loading={isLoading}
                    loadingRows={8}
                    storageKey="notification-preferences-col-prefs"
                    sort={sort}
                    onSortChange={setSort}
                    filters={filters}
                    onFiltersChange={setFilters}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[10, 15, 25, 50]}
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    total={filtered.length}
                    emptyState={
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-6">
                            <Bell className="h-10 w-10 opacity-30" />
                            <p className="font-medium">No notification types for this channel</p>
                        </div>
                    }
                />
            )}

            <ChannelSelectionModal
                pref={editingPref}
                onClose={() => setEditingPref(null)}
                onSave={handleSaveChannels}
                saving={update.isPending}
            />
        </div>
    );
}
