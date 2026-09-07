'use client';

import { Button } from '@/components/ui/base';
import { useMe } from '@/hooks/useMe';
import { useConversationMessages, useMarkRead, useSendReply } from '@/hooks/use-whatsapp-inbox';
import { useConversations } from '@/hooks/use-whatsapp-inbox';
import { useWhatsAppInboxStream } from '@/hooks/use-whatsapp-inbox-stream';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowLeft, Loader2, Send } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function WhatsAppThreadPage() {
    const params = useParams<{ conversationId: string }>();
    const conversationId = params.conversationId;
    const router = useRouter();
    const { hasPermission } = useMe();
    const canReply = hasPermission('notifications.whatsapp_inbox.reply');

    const { data, isLoading } = useConversationMessages(conversationId);
    useWhatsAppInboxStream(conversationId);
    // Reuse the list query (already polling) to get this conversation's window/contact info
    // rather than a second endpoint just for header details.
    const { data: convList } = useConversations({ limit: 50 });
    const conversation = convList?.data.find((c) => c.id === conversationId);

    const sendReply = useSendReply(conversationId);
    const markRead = useMarkRead();
    const [draft, setDraft] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const markedRef = useRef(false);

    const messages = useMemo(() => data?.data ?? [], [data]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        if (!markedRef.current && conversationId) {
            markedRef.current = true;
            markRead.mutate(conversationId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    const handleSend = () => {
        const body = draft.trim();
        if (!body) return;
        sendReply.mutate(body, {
            onSuccess: () => setDraft(''),
            onError: (err: any) => {
                if (err?.response?.data?.error === 'window_closed') {
                    toast.error('The 24h reply window has closed for this conversation.');
                } else {
                    toast.error(err?.response?.data?.message ?? 'Failed to send reply');
                }
            },
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
            <div className="flex items-center gap-3 p-4 border-b border-border">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.push('/whatsapp/inbox')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="font-bold">{conversation?.customer_name || `+${conversation?.customer_wa_id ?? '...'}`}</h2>
                    {conversation?.customer_name && (
                        <p className="text-xs text-muted-foreground">+{conversation.customer_wa_id}</p>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-accent/5">
                {isLoading && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                )}
                {messages.map((m) => (
                    <div key={m.id} className={cn('flex', m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                        <div
                            className={cn(
                                'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                                m.direction === 'outbound'
                                    ? 'bg-primary text-primary-foreground rounded-br-none'
                                    : 'bg-card border border-border rounded-bl-none'
                            )}
                        >
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p className={cn('text-[10px] mt-1 text-right', m.direction === 'outbound' ? 'opacity-70' : 'text-muted-foreground')}>
                                {formatTime(m.created_at)}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-border space-y-2">
                {conversation && !conversation.window_open && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        The 24h reply window has closed. WhatsApp only allows free-form replies within 24h of the
                        customer&apos;s last message — a new message from them will reopen it.
                    </div>
                )}
                {!canReply && (
                    <p className="text-xs text-muted-foreground">You don&apos;t have permission to reply.</p>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a reply..."
                        disabled={!canReply || conversation?.window_open === false || sendReply.isPending}
                        className="flex-1 bg-accent/20 p-2.5 rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                    />
                    <Button
                        size="sm"
                        className="shrink-0 gap-1.5"
                        disabled={!canReply || !draft.trim() || conversation?.window_open === false || sendReply.isPending}
                        onClick={handleSend}
                    >
                        {sendReply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
