'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
    page: number;
    total: number;
    limit: number;
    hasMore: boolean;
    onPageChange: (page: number) => void;
    className?: string;
    variant?: 'default' | 'compact';
}

export function Pagination({ page, total, limit, hasMore, onPageChange, className, variant = 'default' }: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = Math.min((page - 1) * limit + 1, total);
    const end = Math.min(page * limit, total);

    // Build visible page numbers (max 5 around current)
    const pages: number[] = [];
    const range = 2;
    for (let i = Math.max(1, page - range); i <= Math.min(totalPages, page + range); i++) {
        pages.push(i);
    }

    if (total === 0) return null;

    return (
        <div className={cn("flex items-center justify-between py-4 px-2", className, variant === 'compact' && "py-0 px-0 justify-end")}>
            {variant === 'default' && (
                <p className="text-xs text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{start}</span>–<span className="font-medium text-foreground">{end}</span> of{' '}
                    <span className="font-medium text-foreground">{total.toLocaleString()}</span>
                </p>
            )}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-lg text-sm transition-colors",
                        page <= 1 ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                {pages[0] > 1 && (
                    <>
                        <button onClick={() => onPageChange(1)} className="h-8 w-8 flex items-center justify-center rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">1</button>
                        {pages[0] > 2 && <span className="text-muted-foreground/50 text-xs px-1">...</span>}
                    </>
                )}
                {pages.map((p) => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={cn(
                            "h-8 w-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors",
                            p === page ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                    >
                        {p}
                    </button>
                ))}
                {pages[pages.length - 1] < totalPages && (
                    <>
                        {pages[pages.length - 1] < totalPages - 1 && <span className="text-muted-foreground/50 text-xs px-1">...</span>}
                        <button onClick={() => onPageChange(totalPages)} className="h-8 w-8 flex items-center justify-center rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">{totalPages}</button>
                    </>
                )}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!hasMore}
                    className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-lg text-sm transition-colors",
                        !hasMore ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
