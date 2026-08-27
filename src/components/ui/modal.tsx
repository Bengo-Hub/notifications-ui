'use client';

// Minimal reusable modal shell — this app has no shared Dialog component (shared-ui-lib doesn't
// ship one either), and the existing ad-hoc overlay in monitoring/page.tsx was never split out.
// Mirrors that exact pattern (fixed overlay + centered Card) so every modal in the app looks and
// behaves the same, instead of each screen hand-rolling its own.

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    className,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <Card
                className={className ?? 'max-w-md w-full shadow-xl'}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <h3 className="font-bold">{title}</h3>
                        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onClose} aria-label="Close">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>{children}</CardContent>
            </Card>
        </div>
    );
}
