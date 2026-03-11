'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useTemplates } from '@/hooks/use-templates';
import { cn } from '@/lib/utils';
import { Edit2, Mail, MessageSquare, MoreVertical, Plus, Search, Smartphone, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function TemplatesPage() {
    const { data: templates = [], isLoading: loading, isError, refetch } = useTemplates();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTemplates = useMemo(() => templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.type.toLowerCase().includes(searchQuery.toLowerCase())
    ), [templates, searchQuery]);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'email': return <Mail className="h-4 w-4" />;
            case 'sms': return <MessageSquare className="h-4 w-4" />;
            case 'push': return <Smartphone className="h-4 w-4" />;
            default: return <Zap className="h-4 w-4" />;
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notification Templates</h1>
                    <p className="text-muted-foreground mt-1">Manage cross-channel communication templates for your organization.</p>
                </div>
                <Button className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    Create Template
                </Button>
            </div>

            {isError && (
                <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                    <p className="text-sm text-destructive">Failed to load templates.</p>
                    <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                        <div className="relative w-full max-w-sm group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                placeholder="Filter templates..."
                                className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="default" className="cursor-pointer">All</Badge>
                            <Badge variant="outline" className="cursor-pointer border-muted text-muted-foreground">Email</Badge>
                            <Badge variant="outline" className="cursor-pointer border-muted text-muted-foreground">SMS</Badge>
                            <Badge variant="outline" className="cursor-pointer border-muted text-muted-foreground">Push</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border overflow-x-auto">
                            {loading ? (
                                <div className="p-12 text-center text-muted-foreground">Loading templates...</div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="p-12 text-center">
                                    <p className="text-muted-foreground">
                                        {templates.length === 0 ? 'No templates yet. Templates are provided by the platform and can be edited here once listed.' : 'No templates match your search.'}
                                    </p>
                                </div>
                            ) : filteredTemplates.map((template) => (
                                <div key={template.id} className="p-4 flex items-center justify-between hover:bg-accent/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-lg flex items-center justify-center border border-border shadow-sm",
                                            template.type === 'email' ? "bg-blue-500/10 text-blue-500" :
                                                template.type === 'sms' ? "bg-green-500/10 text-green-500" :
                                                    "bg-orange-500/10 text-orange-500"
                                        )}>
                                            {getTypeIcon(template.type)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{template.name}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{template.subject || template.content}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Sync</p>
                                            <p className="text-xs font-semibold">{new Date(template.updatedAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <button className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                    <Zap className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <h3 className="font-bold">Pro Tip: Variables</h3>
                            </div>
                            <p className="text-sm text-balance text-muted-foreground leading-relaxed">
                                Use <code className="bg-primary/10 text-primary px-1 rounded">{"{{variable_name}}"}</code> in your content to dynamically inject data from your events.
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <div className="bg-background/50 p-2 rounded border border-border text-[10px] font-mono text-muted-foreground">{"{{user_name}}"}</div>
                                <div className="bg-background/50 p-2 rounded border border-border text-[10px] font-mono text-muted-foreground">{"{{order_id}}"}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <h3 className="font-bold text-sm">Template Statistics</h3>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Total Sent (24h)</span>
                                <span className="text-sm font-bold">1,284</span>
                            </div>
                            <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden">
                                <div className="bg-primary w-[65%] h-full"></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Delivery Rate</span>
                                <span className="text-sm font-bold text-green-500">99.2%</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
