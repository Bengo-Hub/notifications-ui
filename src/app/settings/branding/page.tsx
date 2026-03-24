'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { ExternalLink, Palette } from 'lucide-react';

const AUTH_UI_URL =
    process.env.NEXT_PUBLIC_AUTH_UI_URL ||
    'https://accounts.codevertexitsolutions.com';

export default function BrandingPage() {
    return (
        <div className="flex items-center justify-center p-12">
            <Card className="max-w-lg w-full">
                <CardHeader className="border-b border-border/50 py-4">
                    <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">
                            Branding Settings
                        </h3>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-center">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Tenant branding is managed in the account portal.
                        <br />
                        Logo, colors, and typography settings can be configured there
                        and will automatically apply across all services.
                    </p>
                    <a
                        href={`${AUTH_UI_URL}/dashboard/settings?tab=branding`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-2 text-sm font-medium transition-colors shadow-lg shadow-primary/10"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open Branding Settings
                    </a>
                </CardContent>
            </Card>
        </div>
    );
}
