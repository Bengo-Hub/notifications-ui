'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PlatformTenantsPage() {
    const router = useRouter();
    const [slug, setSlug] = useState('');

    const goToTenant = () => {
        const s = slug.trim().toLowerCase().replace(/\s+/g, '-');
        if (!s) return;
        router.push(`/${s}/dashboard`);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-7 w-7" />
                    Tenant management
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Open a tenant by organisation slug to manage their dashboard, templates, and configuration.
                </p>
            </div>

            <Card>
                <CardContent className="p-6">
                    <label className="text-sm font-medium block mb-2">Organisation slug</label>
                    <div className="flex gap-2 max-w-md">
                        <input
                            type="text"
                            placeholder="e.g. urban-loft, codevertex"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && goToTenant()}
                            className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                        />
                        <Button onClick={goToTenant} disabled={!slug.trim()}>
                            Open tenant
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Tenant-specific routes: /[orgSlug]/dashboard, /[orgSlug]/templates, /[orgSlug]/settings/providers, /[orgSlug]/settings/branding
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-muted/30">
                <CardContent className="p-4 text-sm text-muted-foreground">
                    Backend tenant routes: /api/v1/[tenantId]/templates, /api/v1/[tenantId]/providers/available, /api/v1/[tenantId]/branding. Platform config is unscoped.
                </CardContent>
            </Card>
        </div>
    );
}
