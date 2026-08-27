'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { usePlatformTenants } from '@/hooks/use-settings';
import { ArrowRight, Building2, Loader2, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function PlatformTenantsPage() {
    const router = useRouter();
    const [slug, setSlug] = useState('');
    const { data: tenants = [], isLoading, isError, refetch } = usePlatformTenants();

    const goToSlug = (s: string) => {
        const normalized = s.trim().toLowerCase().replace(/\s+/g, '-');
        if (!normalized) return;
        localStorage.setItem('tenant_slug', normalized);
        router.push('/dashboard');
    };

    const goToTenant = () => goToSlug(slug);

    const filtered = useMemo(() => {
        const q = slug.trim().toLowerCase();
        if (!q) return tenants;
        return tenants.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
    }, [tenants, slug]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    Tenant Management
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Switch to a tenant context to manage their notifications, templates, and provider settings.
                </p>
            </div>

            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Building2 className="h-4 w-4 text-primary" />
                        Switch Tenant Context
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Search tenants below, or type a slug directly to view and manage their notification configuration.
                    </p>
                    <div className="flex gap-2 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <input
                                type="text"
                                placeholder="Search by name or slug — e.g. urban-loft, codevertex"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && goToTenant()}
                                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all"
                            />
                        </div>
                        <Button onClick={goToTenant} disabled={!slug.trim()} className="gap-2">
                            Open
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Users className="h-4 w-4 text-primary" />
                            Active Tenants
                        </div>
                        <Badge variant="outline" className="text-[10px]">{filtered.length} of {tenants.length}</Badge>
                    </div>

                    {isLoading && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading tenants...
                        </div>
                    )}

                    {isError && (
                        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                            <p className="text-sm text-destructive">Failed to load tenants.</p>
                            <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                        </div>
                    )}

                    {!isLoading && !isError && filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground py-6 text-center">No tenants match &quot;{slug}&quot;.</p>
                    )}

                    {!isLoading && filtered.length > 0 && (
                        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                            {filtered.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => goToSlug(t.slug)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/10 transition-colors group"
                                >
                                    <div>
                                        <p className="text-sm font-semibold">{t.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
