'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { ArrowRight, Building2, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PlatformTenantsPage() {
    const router = useRouter();
    const [slug, setSlug] = useState('');

    const goToTenant = () => {
        const s = slug.trim().toLowerCase().replace(/\s+/g, '-');
        if (!s) return;
        localStorage.setItem('tenant_slug', s);
        router.push('/dashboard');
    };

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
                        Enter an organisation slug to view and manage their notification configuration.
                    </p>
                    <div className="flex gap-2 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <input
                                type="text"
                                placeholder="e.g. urban-loft, codevertex"
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
        </div>
    );
}
