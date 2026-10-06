'use client';

import { Card, CardContent } from '@/components/ui/base';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { useMe } from '@/hooks/useMe';
import { useConversations } from '@/hooks/use-whatsapp-inbox';
import { useWhatsAppInboxStream } from '@/hooks/use-whatsapp-inbox-stream';
import { PushPermissionPrompt } from '@/components/push-permission-prompt';
import { buildConversationColumns } from './conversation-columns';
import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { WhatsAppConversation } from '@/lib/api/whatsapp-inbox';

export default function WhatsAppInboxPage() {
    const { hasPermission } = useMe();
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const { data, isLoading, isError, refetch } = useConversations({ page, limit: pageSize });
    const columns = useMemo(() => buildConversationColumns(), []);
    useWhatsAppInboxStream();

    if (!hasPermission('notifications.whatsapp_inbox.view')) {
        return (
            <div className="p-12 text-center text-muted-foreground">
                You don&apos;t have access to the WhatsApp inbox.
            </div>
        );
    }

    const rows = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                        <MessageCircle className="h-6 w-6 text-primary sm:h-7 sm:w-7" /> WhatsApp Inbox
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        Conversations with your customers over WhatsApp.
                    </p>
                </div>
                {total > 0 && (
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
                        {total} conversation{total === 1 ? '' : 's'}
                    </span>
                )}
            </div>

            <PushPermissionPrompt />

            {isError && (
                <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                    <p className="text-sm text-destructive">Failed to load conversations.</p>
                    <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    <DataTable<WhatsAppConversation>
                        columns={columns}
                        rows={rows}
                        rowKey={(c) => c.id}
                        loading={isLoading}
                        loadingRows={6}
                        onRowClick={(c) => router.push(`/whatsapp/inbox/${c.id}`)}
                        storageKey="whatsapp-inbox-col-prefs"
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        pageSize={pageSize}
                        onPageSizeChange={setPageSize}
                        pageSizeOptions={[10, 20, 50]}
                        total={total}
                        emptyState={
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-12">
                                <MessageCircle className="h-10 w-10 opacity-30" />
                                <p>No conversations yet. They appear here when a customer messages your WhatsApp number.</p>
                            </div>
                        }
                    />
                </CardContent>
            </Card>
        </div>
    );
}
