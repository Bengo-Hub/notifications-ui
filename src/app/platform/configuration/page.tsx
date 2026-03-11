'use client';

import { Card, CardContent } from '@/components/ui/base';
import Link from 'next/link';
import { Link2, Server, Users } from 'lucide-react';

export default function PlatformConfigurationPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Configuration management</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Platform-level and tenant-level configuration. All backend logic is linked via these sections.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Link href="/platform/providers">
                    <Card className="hover:border-primary/50 transition-colors h-full">
                        <CardContent className="p-6">
                            <Server className="h-8 w-8 text-muted-foreground mb-2" />
                            <h2 className="font-semibold">Platform providers</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Email (SMTP, SendGrid), SMS (Africa&apos;s Talking). Configure and test. Secrets encrypted at rest.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/platform/tenants">
                    <Card className="hover:border-primary/50 transition-colors h-full">
                        <CardContent className="p-6">
                            <Users className="h-8 w-8 text-muted-foreground mb-2" />
                            <h2 className="font-semibold">Tenant management</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Open tenant by org slug. Tenant routes: dashboard, templates, settings, branding.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <Card className="bg-muted/30">
                <CardContent className="p-4">
                    <h3 className="font-medium flex items-center gap-2 mb-2">
                        <Link2 className="h-4 w-4" />
                        Backend links
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Platform: GET/POST /api/v1/platform/providers, POST /api/v1/platform/providers/:id/test</li>
                        <li>• Tenant: /api/v1/templates, /api/v1/providers/available, /api/v1/branding</li>
                        <li>• Analytics: GET /api/v1/analytics/delivery-stats</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
