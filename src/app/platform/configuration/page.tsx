'use client';

import { Card, CardContent } from '@/components/ui/base';
import { Server, Users } from 'lucide-react';
import Link from 'next/link';

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
        </div>
    );
}
