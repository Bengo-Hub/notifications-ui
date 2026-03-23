'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useMe } from '@/hooks/useMe';
import { Pagination } from '@/components/ui/pagination';
import { useTemplates } from '@/hooks/use-templates';
import { isPlatformOwnerOrSuperuser } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';
import { Edit2, Hash, Mail, MessageCircle, MessageSquare, Plus, Search, Smartphone, Tag, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

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
    const hasMore = result?.hasMore ?? false;
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
                    <Button className="gap-2 shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4" />
                        Create Template
                    </Button>
                )}
            </div>

            {isError && (
                <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                    <p className="text-sm text-destructive">Failed to load templates.</p>
                    <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-col space-y-4 py-4 md:py-6">
                        <div className="flex flex-row items-center justify-between gap-4">
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

                        {/* Top Pagination */}
                        {total > limit && (
                            <div className="flex items-center justify-between border-t border-border/50 pt-4">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                    Displaying {templates.length} of {total}
                                </span>
                                <Pagination
                                    page={page}
                                    total={total}
                                    limit={limit}
                                    hasMore={hasMore}
                                    onPageChange={setPage}
                                    variant="compact"
                                />
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="p-12 text-center text-muted-foreground">Loading templates...</div>
                            ) : templates.length === 0 ? (
                                <div className="p-12 text-center">
                                    <p className="text-muted-foreground">
                                        {total === 0 && !searchQuery && !categoryFilter
                                            ? 'No templates yet. Templates are seeded from the platform and can be edited here.'
                                            : 'No templates match your filters.'}
                                    </p>
                                </div>
                            ) : templates.map((template) => (
                                <div
                                    key={`${template.channel}-${template.name}`}
                                    className="p-4 flex items-center justify-between hover:bg-accent/5 transition-colors group cursor-pointer"
                                    onClick={() => router.push(`/templates/${template.filePath?.replace(/\.[^.]+$/, '').replace(/^[^/]+\//, '') ?? template.name}?channel=${template.channel}`)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-lg flex items-center justify-center border border-border shadow-sm",
                                            template.channel === 'email' ? "bg-blue-500/10 text-blue-500" :
                                                template.channel === 'sms' ? "bg-green-500/10 text-green-500" :
                                                    template.channel === 'whatsapp' ? "bg-emerald-500/10 text-emerald-500" :
                                                        "bg-orange-500/10 text-orange-500"
                                        )}>
                                            {getTypeIcon(template.channel)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{template.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{template.channel}</Badge>
                                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                                    <Tag className="h-2.5 w-2.5 mr-1" />{template.category}
                                                </Badge>
                                                {template.variables?.length > 0 && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                                                        <Hash className="h-2.5 w-2.5 mr-0.5" />{template.variables.length} vars
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canManage && (
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e: React.MouseEvent) => { e.stopPropagation(); router.push(`/templates/${template.filePath?.replace(/\.[^.]+$/, '').replace(/^[^/]+\//, '') ?? template.name}?channel=${template.channel}`); }}>
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Pagination */}
                        {total > 0 && (
                            <div className="border-t border-border">
                                <Pagination
                                    page={page}
                                    total={total}
                                    limit={limit}
                                    hasMore={hasMore}
                                    onPageChange={setPage}
                                />
                            </div>
                        )}
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
