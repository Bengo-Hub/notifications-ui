'use client';

import { useMe } from '@/hooks/useMe';
import { useActivityLogs, useDeliveryStats } from '@/hooks/use-analytics';
import { useTemplates } from '@/hooks/use-templates';
import { isPlatformOwnerOrSuperuser } from '@/lib/auth/permissions';
import { Activity, Mail, MessageSquare, Smartphone } from 'lucide-react';

export default function DashboardPage() {
    const { user } = useMe();
    const isPlatformUser = isPlatformOwnerOrSuperuser(user ?? null);

    const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useDeliveryStats();
    const { data: templates = [], isLoading: templatesLoading, isError: templatesError, refetch: refetchTemplates } = useTemplates({ enabled: isPlatformUser });
    const { data: activityLogs = [], isLoading: logsLoading, isError: logsError, refetch: refetchLogs } = useActivityLogs(10);

    const loading = statsLoading || (isPlatformUser && templatesLoading) || logsLoading;
    const hasError = statsError || (isPlatformUser && templatesError) || logsError;

    const handleRetry = () => {
        refetchStats();
        if (isPlatformUser) refetchTemplates();
        refetchLogs();
    };

    if (loading && !stats && !(isPlatformUser && templates?.length)) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-64 bg-muted rounded" />
                    <div className={`grid gap-6 ${isPlatformUser ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                        {isPlatformUser && <div className="h-32 bg-muted rounded-2xl" />}
                        <div className="h-32 bg-muted rounded-2xl" />
                        <div className="h-32 bg-muted rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    const tenantName = user?.tenantSlug
        ? user.tenantSlug.charAt(0).toUpperCase() + user.tenantSlug.slice(1).replace(/-/g, ' ')
        : 'Your Organization';

    return (
        <div className="p-8">
            <div className="flex flex-col gap-6">
                <div>
                    {isPlatformUser ? (
                        <>
                            <h1 className="text-3xl font-bold tracking-tight">Notification Center</h1>
                            <p className="text-muted-foreground mt-1">Manage templates, providers, and tenant-specific delivery rules.</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold tracking-tight">Welcome, {tenantName}</h1>
                            <p className="text-muted-foreground mt-1">Your notification delivery overview.</p>
                        </>
                    )}
                </div>

                {hasError && (
                    <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                        <p className="text-sm text-destructive">Failed to load dashboard data.</p>
                        <button
                            onClick={handleRetry}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className={`grid gap-6 ${isPlatformUser ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
                    {isPlatformUser && (
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                            <h3 className="text-lg font-semibold">Active Templates</h3>
                            <p className="text-4xl font-bold mt-2">
                                {templatesLoading ? '—' : templates.length}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Available notification templates</p>
                        </div>
                    )}

                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">Delivery Rate</h3>
                        <p className="text-4xl font-bold mt-2">
                            {statsLoading ? '—' : stats != null ? `${stats.deliveryRate.toFixed(1)}%` : '0%'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">Total Sent (24h)</h3>
                        <p className="text-4xl font-bold mt-2">
                            {statsLoading ? '—' : stats?.totalSent?.toLocaleString() ?? '0'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">SMS, Email, Push</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Recent Activity
                    </h3>
                    {logsLoading ? (
                        <p className="text-muted-foreground mt-4 text-sm">Loading activity...</p>
                    ) : activityLogs.length === 0 ? (
                        <p className="text-muted-foreground mt-4 text-sm">No recent notifications sent yet.</p>
                    ) : (
                        <ul className="mt-4 space-y-2 divide-y divide-border">
                            {activityLogs.slice(0, 5).map((log) => (
                                <li key={log.id} className="py-2 flex items-center gap-3 text-sm">
                                    {log.channel === 'email' && <Mail className="h-4 w-4 text-muted-foreground" />}
                                    {log.channel === 'sms' && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                                    {log.channel === 'push' && <Smartphone className="h-4 w-4 text-muted-foreground" />}
                                    <span className="font-medium">{log.templateName}</span>
                                    <span className="text-muted-foreground">&rarr; {log.recipient}</span>
                                    <span className="text-muted-foreground text-xs ml-auto">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
