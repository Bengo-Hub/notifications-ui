'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export function Card({ children, className, ...props }: { children: ReactNode; className?: string; [key: string]: any }) {
    return (
        <div className={cn("rounded-2xl border border-border bg-card shadow-sm overflow-hidden", className)} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className, ...props }: { children: ReactNode; className?: string; [key: string]: any }) {
    return <div className={cn("px-6 py-4 border-b border-border bg-accent/5", className)} {...props}>{children}</div>;
}

export function CardContent({ children, className, ...props }: { children: ReactNode; className?: string; [key: string]: any }) {
    return <div className={cn("p-6", className)} {...props}>{children}</div>;
}

export function Button({
    children,
    className,
    variant = 'primary',
    ...props
}: {
    children: ReactNode;
    className?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    [key: string]: any;
}) {
    const variants = {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    };

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export function Badge({ children, className, variant = 'default', ...props }: { children: ReactNode; className?: string; variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'; [key: string]: any }) {
    const variants = {
        default: 'bg-primary/10 text-primary border-primary/20',
        success: 'bg-green-500/10 text-green-500 border-green-500/20',
        warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        error: 'bg-red-500/10 text-red-500 border-red-500/20',
        outline: 'bg-transparent text-muted-foreground border-border',
        secondary: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
    };

    return (
        <span
            className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wider", variants[variant], className)}
            {...props}
        >
            {children}
        </span>
    );
}
