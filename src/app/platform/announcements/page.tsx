'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Modal } from '@/components/ui/modal';
import { useAnnouncements, useDeleteAnnouncement } from '@/hooks/use-announcements';
import type { Announcement } from '@/lib/api/announcements';
import { Loader2, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ANNOUNCEMENT_APPS, AnnouncementForm } from './announcement-form';

function status(a: Announcement, now: number): { label: string; variant: 'success' | 'warning' | 'secondary' } {
    if (!a.is_active) return { label: 'Off', variant: 'secondary' };
    if (new Date(a.starts_at).getTime() > now) return { label: 'Scheduled', variant: 'warning' };
    return { label: 'Live', variant: 'success' };
}

function when(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No end';
}

/** Platform > Announcements: the "what's new" banners the apps show on their dashboards. */
export default function AnnouncementsPage() {
    const { data: list = [], isLoading } = useAnnouncements();
    const del = useDeleteAnnouncement();
    const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
    const now = Date.now();

    const remove = async (a: Announcement) => {
        if (!window.confirm(`Delete "${a.title}"? It disappears from every dashboard.`)) return;
        try {
            await del.mutateAsync(a.id);
            toast.success('Announcement deleted');
        } catch {
            toast.error('Could not delete the announcement');
        }
    };

    const appLabel = (keys?: string[]) =>
        !keys || keys.length === 0 ? 'Every app' : keys.map((k) => ANNOUNCEMENT_APPS.find((a) => a.key === k)?.label ?? k).join(', ');

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="font-bold flex items-center gap-2"><Megaphone className="h-4 w-4" /> Announcements</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Banners on the apps&apos; dashboards for new features and updates. Users dismiss them on their own; ended ones are deleted automatically.
                    </p>
                </div>
                <Button onClick={() => setEditing('new')} className="gap-2 shrink-0"><Plus className="h-4 w-4" /> New</Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : list.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No announcements yet.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {list.map((a) => {
                            const s = status(a, now);
                            return (
                                <li key={a.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold">{a.title}</span>
                                            <Badge variant={s.variant}>{s.label}</Badge>
                                            {a.audience === 'admins' && <Badge variant="outline">Admins</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{a.summary}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {appLabel(a.services)} · {when(a.starts_at)} to {when(a.ends_at)} · priority {a.priority}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                                        <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => remove(a)} disabled={del.isPending}>
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={editing === 'new' ? 'New announcement' : 'Edit announcement'}
                description="Shown on the dashboards of the apps you pick, between the start and end."
                className="max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto"
            >
                {editing !== null && (
                    <AnnouncementForm initial={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
                )}
            </Modal>
        </Card>
    );
}
