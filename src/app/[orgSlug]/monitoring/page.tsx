'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useActivityLogs, useDeliveryStats } from '@/hooks/use-analytics';
import { cn } from '@/lib/utils';
import { Activity, AlertCircle, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Clock, Download, Filter, Mail, MessageSquare, Smartphone, Zap } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function MonitoringPage() {
    const { orgSlug } = useParams() as { orgSlug: string };
    const { data: stats, isLoading: statsLoading } = useDeliveryStats(orgSlug);
    const { data: logs = [], isLoading: logsLoading } = useActivityLogs(orgSlug);
    const loading = statsLoading || logsLoading;

    if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Synchronizing real-time data...</div>;

    const kpis = [
        { name: 'Total Messages', value: stats?.totalSent?.toLocaleString() ?? '—', trend: '+12%', icon: Zap, color: 'blue' },
        { name: 'Delivery Rate', value: stats != null ? `${stats.deliveryRate}%` : '—', trend: '+0.4%', icon: CheckCircle2, color: 'green' },
        { name: 'Error Rate', value: stats != null ? `${stats.errorRate}%` : '—', trend: '-0.1%', icon: AlertCircle, color: 'orange' },
    ];

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
                    <p className="text-muted-foreground mt-1">Real-time performance metrics and delivery audit logs.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 bg-card">
                        <Download className="h-4 w-4" /> Export Report
                    </Button>
                    <Button className="gap-2 shadow-lg shadow-primary/20">
                        <Activity className="h-4 w-4" /> Live View
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {kpis.map((kpi) => (
                    <Card key={kpi.name} className="relative overflow-hidden group border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className={cn(
                                    "p-2.5 rounded-xl border border-border/50",
                                    kpi.color === 'blue' ? "bg-blue-500/10 text-blue-500" :
                                        kpi.color === 'green' ? "bg-green-500/10 text-green-500" :
                                            "bg-orange-500/10 text-orange-500"
                                )}>
                                    <kpi.icon className="h-5 w-5" />
                                </div>
                                <div className={cn(
                                    "flex items-center gap-0.5 text-xs font-bold",
                                    kpi.trend.startsWith('+') ? "text-green-500" : "text-orange-500"
                                )}>
                                    {kpi.trend.startsWith('+') ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {kpi.trend}
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{kpi.name}</p>
                                <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm border-border/40">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 py-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            <h3 className="font-bold text-sm uppercase tracking-tight">Delivery Performance</h3>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="default" className="cursor-pointer">7D</Badge>
                            <Badge variant="default" className="cursor-pointer">24H</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 h-[300px] flex items-end justify-between gap-2">
                        {stats?.timeSeries.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-full flex flex-col justify-end gap-1 h-[200px]">
                                    <div
                                        className="w-full bg-primary/20 rounded-t-sm group-hover:bg-primary/40 transition-colors"
                                        style={{ height: `${(d.sent / 150) * 100}%` }}
                                    />
                                    <div
                                        className="w-full bg-primary rounded-t-sm shadow-lg shadow-primary/10"
                                        style={{ height: `${(d.delivered / 150) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground font-bold">{d.date.split('-').slice(1).join('/')}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/40">
                    <CardHeader className="border-b border-border/50 py-4">
                        <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-primary" />
                            <h3 className="font-bold text-sm uppercase tracking-tight">Channel Distribution</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {Object.entries(stats?.channelBreakdown || {}).map(([channel, count]) => (
                            <div key={channel} className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2 uppercase font-bold tracking-widest text-muted-foreground">
                                        {channel === 'email' && <Mail className="h-3 w-3" />}
                                        {channel === 'sms' && <MessageSquare className="h-3 w-3" />}
                                        {channel === 'push' && <Smartphone className="h-3 w-3" />}
                                        {channel}
                                    </div>
                                    <span className="font-bold">{count}</span>
                                </div>
                                <div className="h-2 w-full bg-accent/30 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full shadow-[0_0_10px_-2px_rgba(0,0,0,0.1)]",
                                            channel === 'email' ? "bg-blue-500" : channel === 'sms' ? "bg-green-500" : "bg-orange-500"
                                        )}
                                        style={{ width: `${(count / (stats?.totalSent || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="pt-4 border-t border-border/50">
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <p className="text-[10px] uppercase font-bold text-primary tracking-widest leading-none">Best Performer</p>
                                <p className="text-sm font-bold mt-2">Email Delivery (99.8%)</p>
                                <p className="text-xs text-muted-foreground mt-1">SMTP SendGrid performing within SLA.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border-border/40">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 py-4">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">Live Activity Feed</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input placeholder="Filter logs..." className="bg-accent/30 border-none rounded-lg py-1.5 pl-8 pr-3 text-xs focus:ring-1 focus:ring-primary outline-none" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 flex items-center justify-between hover:bg-accent/5 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center border border-border/50 shadow-sm",
                                        log.channel === 'email' ? "text-blue-500 bg-blue-500/5" :
                                            log.channel === 'sms' ? "text-green-500 bg-green-500/5" : "text-orange-500 bg-orange-500/5"
                                    )}>
                                        {log.channel === 'email' ? <Mail className="h-4 w-4" /> :
                                            log.channel === 'sms' ? <MessageSquare className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold">{log.templateName}</span>
                                            <Badge variant="default" className="text-[10px] py-0 px-1.5 leading-tight uppercase scale-90">
                                                {log.status}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{log.recipient}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">Today</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all">
                                        <ArrowUpRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="p-12 text-center text-muted-foreground italic">No recent activity detected.</div>
                        )}
                    </div>
                </CardContent>
                <div className="p-3 bg-accent/5 border-t border-border/50 text-center">
                    <button className="text-[10px] uppercase font-bold tracking-widest text-primary hover:underline">View All Historical Logs</button>
                </div>
            </Card>
        </div>
    );
}
