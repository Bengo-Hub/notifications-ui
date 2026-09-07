'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useMe } from '@/hooks/useMe';
import { useTemplates } from '@/hooks/use-templates';
import { isPlatformOwnerOrSuperuser } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { Mail, MessageCircle, MessageSquare, Plus, Search, Send, Smartphone, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { WhatsAppSyncModal } from './whatsapp-sync-modal';
import { buildTemplateColumns } from './template-columns';
import type { NotificationTemplate } from '@/lib/api/templates';

const CHANNELS = ['all', 'email', 'sms', 'push', 'whatsapp'] as const;
type Channel = (typeof CHANNELS)[number];

const COMMON_CATEGORIES = ['auth', 'cafe', 'finance', 'logistics', 'shared'];

export default function TemplatesPage() {
    const { user } = useMe();
    const canManage = isPlatformOwnerOrSuperuser(user);

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [channelFilter, setChannelFilter] = useState<Channel>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [searchInput, setSearchInput] = useState('');
    const [syncModalOpen, setSyncModalOpen] = useState(false);
    const router = useRouter();

    const { data: result, isLoading: loading, isError, refetch } = useTemplates({
        page,
        limit: 20,
        channel: channelFilter !== 'all' ? channelFilter : undefined,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
    });

    const templates = result?.data ?? [];
    const total = result?.total ?? 0;
    const limit = result?.limit ?? 20;

    // Collect unique categories: start with common ones, add those from current page
    const categories = useMemo(() => {
        const cats = new Set<string>(COMMON_CATEGORIES);
        templates.forEach(t => { if (t.category) cats.add(t.category); });
        return Array.from(cats).sort();
    }, [templates]);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'email': return <Mail className="h-4 w-4" />;
            case 'sms': return <MessageSquare className="h-4 w-4" />;
            case 'push': return <Smartphone className="h-4 w-4" />;
            case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
            default: return <Zap className="h-4 w-4" />;
        }
    };

    const handleSearch = () => {
        setSearchQuery(searchInput);
        setPage(1);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSearchInput('');
        setChannelFilter('all');
        setCategoryFilter('');
        setPage(1);
    };

    const handleChannelChange = (ch: Channel) => {
        if (ch === 'all') {
            clearFilters();
        } else {
            setChannelFilter(ch);
            setPage(1);
        }
    };

    const handleCategoryChange = (cat: string) => {
        setCategoryFilter(prev => prev === cat ? '' : cat);
        setPage(1);
    };

    const goToTemplate = useCallback((template: NotificationTemplate) => {
        router.push(`/templates/${template.filePath?.replace(/\.[^.]+$/, '').replace(/^[^/]+\//, '') ?? template.name}?channel=${template.channel}`);
    }, [router]);

    const columns = useMemo(() => buildTemplateColumns(canManage, goToTemplate), [canManage, goToTemplate]);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notification Templates</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage cross-channel communication templates.
                        {total > 0 && <span className="ml-1 font-medium text-foreground">{total} templates</span>}
                    </p>
                    {/* Category filter badges */}
                    {categories.length > 0 && (
                        <div className="flex gap-2 items-center flex-wrap mt-3">
                            {categories.map((cat) => (
                                <Badge
                                    key={cat}
                                    variant={categoryFilter === cat ? 'default' : 'outline'}
                                    className={cn("cursor-pointer capitalize", categoryFilter !== cat && "border-muted text-muted-foreground")}
                                    onClick={() => handleCategoryChange(cat)}
                                >
                                    {cat}
                                </Badge>
                            ))}
                            {(searchQuery || channelFilter !== 'all' || categoryFilter) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                {canManage && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => setSyncModalOpen(true)}>
                            <Send className="h-4 w-4" />
                            Sync WhatsApp to Meta
                        </Button>
                        <Button className="gap-2 shadow-lg shadow-primary/20">
                            <Plus className="h-4 w-4" />
                            Create Template
                        </Button>
                    </div>
                )}
            </div>

            <WhatsAppSyncModal open={syncModalOpen} onClose={() => setSyncModalOpen(false)} />

            {isError && (
                <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                    <p className="text-sm text-destructive">Failed to load templates.</p>
                    <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-col space-y-4 py-4 md:py-6">
                        <div className="flex flex-row flex-wrap items-center justify-between gap-4">
                            <div className="relative w-full max-w-sm group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    placeholder="Search templates..."
                                    className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    onBlur={handleSearch}
                                />
                            </div>
                            <div className="flex gap-1.5 flex-wrap shrink-0">
                                {CHANNELS.map((ch) => (
                                    <Badge
                                        key={ch}
                                        variant={channelFilter === ch ? 'default' : 'outline'}
                                        className={cn("cursor-pointer uppercase text-[10px]", channelFilter !== ch && "border-muted text-muted-foreground")}
                                        onClick={() => handleChannelChange(ch)}
                                    >
                                        {ch}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                    </CardHeader>
                    <CardContent className="p-0">
                        <DataTable<NotificationTemplate>
                            columns={columns}
                            rows={templates}
                            rowKey={(t) => `${t.channel}-${t.name}`}
                            loading={loading}
                            loadingRows={8}
                            storageKey="templates-col-prefs"
                            onRowClick={goToTemplate}
                            maxBodyHeight="600px"
                            page={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                            total={total}
                            emptyState={
                                <div className="p-12 text-center">
                                    <p className="text-muted-foreground">
                                        {total === 0 && !searchQuery && !categoryFilter
                                            ? 'No templates yet. Templates are seeded from the platform and can be edited here.'
                                            : 'No templates match your filters.'}
                                    </p>
                                </div>
                            }
                        />
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                    <Zap className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <h3 className="font-bold">Template Variables</h3>
                            </div>
                            <p className="text-sm text-balance text-muted-foreground leading-relaxed">
                                Templates use Go template syntax. Use <code className="bg-primary/10 text-primary px-1 rounded">{"{{ .variable_name }}"}</code> to inject dynamic data.
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <div className="bg-background/50 p-2 rounded border border-border text-[10px] font-mono text-muted-foreground">{"{{ .user_name }}"}</div>
                                <div className="bg-background/50 p-2 rounded border border-border text-[10px] font-mono text-muted-foreground">{"{{ .order_id }}"}</div>
                                <div className="bg-background/50 p-2 rounded border border-border text-[10px] font-mono text-muted-foreground">{"{{ .brand_name }}"}</div>
                                <div className="bg-background/50 p-2 rounded border border-border text-[10px] font-mono text-muted-foreground">{"{{ .amount }}"}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <h3 className="font-bold text-sm">Channels</h3>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {(['email', 'sms', 'push', 'whatsapp'] as const).map((ch) => (
                                <div key={ch} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {getTypeIcon(ch)}
                                        <span className="text-xs capitalize font-medium">{ch}</span>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] cursor-pointer"
                                        onClick={() => handleChannelChange(ch === channelFilter ? 'all' : ch)}
                                    >
                                        Filter
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
