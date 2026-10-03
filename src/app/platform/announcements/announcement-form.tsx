'use client';

import { Button, Switch } from '@/components/ui/base';
import { useSaveAnnouncement } from '@/hooks/use-announcements';
import type { Announcement, AnnouncementInput } from '@/lib/api/announcements';
import { cn } from '@/lib/utils';
import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

/** Apps that render the announcement banner (the service key each app passes). */
export const ANNOUNCEMENT_APPS = [
    { key: 'pos', label: 'POS' },
    { key: 'treasury', label: 'Treasury' },
    { key: 'inventory', label: 'Inventory' },
];

const inputCls = 'w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary outline-none';
const RUN_PRESETS = [7, 14, 30, 60];

/** ISO string to a datetime-local value in the admin's own timezone. */
function toLocalInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromLocalInput(v: string): string | null {
    return v ? new Date(v).toISOString() : null;
}

export function AnnouncementForm({ initial, onDone }: { initial?: Announcement; onDone: () => void }) {
    const save = useSaveAnnouncement();
    const [title, setTitle] = useState(initial?.title ?? '');
    const [summary, setSummary] = useState(initial?.summary ?? '');
    const [highlights, setHighlights] = useState((initial?.highlights ?? []).join('\n'));
    const [ctaLabel, setCtaLabel] = useState(initial?.cta_label ?? '');
    const [ctaUrl, setCtaUrl] = useState(initial?.cta_url ?? '');
    const [services, setServices] = useState<string[]>(initial?.services ?? []);
    const [audience, setAudience] = useState<AnnouncementInput['audience']>(initial?.audience ?? 'all');
    const [tone, setTone] = useState<AnnouncementInput['tone']>(initial?.tone ?? 'feature');
    const [priority, setPriority] = useState(initial?.priority ?? 0);
    const [dismissible, setDismissible] = useState(initial?.dismissible ?? true);
    const [isActive, setIsActive] = useState(initial?.is_active ?? true);
    const [startsAt, setStartsAt] = useState(toLocalInput(initial?.starts_at ?? new Date().toISOString()));
    const [endsAt, setEndsAt] = useState(toLocalInput(initial?.ends_at));

    const runFor = (days: number) => {
        const start = startsAt ? new Date(startsAt) : new Date();
        setEndsAt(toLocalInput(new Date(start.getTime() + days * 86_400_000).toISOString()));
    };

    const toggleApp = (key: string) =>
        setServices((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const body: AnnouncementInput = {
            title, summary,
            highlights: highlights.split('\n').map((h) => h.trim()).filter(Boolean),
            cta_label: ctaLabel, cta_url: ctaUrl, services, audience, tone,
            priority: Number(priority) || 0, dismissible, is_active: isActive,
            starts_at: fromLocalInput(startsAt), ends_at: fromLocalInput(endsAt),
        };
        try {
            await save.mutateAsync({ id: initial?.id, body });
            toast.success(initial ? 'Announcement updated' : 'Announcement published');
            onDone();
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Could not save the announcement');
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold">Title</label>
                <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="New payment gateway: PayHero" />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold">Summary</label>
                <textarea required rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} placeholder="One or two sentences shown on the banner." />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold">Highlights <span className="font-normal text-muted-foreground">(one per line, shown under &quot;What&apos;s included&quot;)</span></label>
                <textarea rows={4} value={highlights} onChange={(e) => setHighlights(e.target.value)} className={inputCls} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Button label</label>
                    <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className={inputCls} placeholder="Set up PayHero" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Button link</label>
                    <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className={inputCls} placeholder="https://books.codevertexafrica.com/{orgSlug}/settings" />
                    <p className="text-[11px] text-muted-foreground">https URL or an app path. {'{orgSlug}'} becomes the viewer&apos;s organization.</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold">Show in</label>
                <div className="flex flex-wrap gap-2">
                    {ANNOUNCEMENT_APPS.map((app) => (
                        <button type="button" key={app.key} onClick={() => toggleApp(app.key)}
                            className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                services.includes(app.key) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent')}>
                            {app.label}
                        </button>
                    ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{services.length === 0 ? 'No app picked: every app shows it.' : 'Only the picked apps show it.'}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Audience</label>
                    <select value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementInput['audience'])} className={inputCls}>
                        <option value="all">Everyone</option>
                        <option value="admins">Admins only</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Style</label>
                    <select value={tone} onChange={(e) => setTone(e.target.value as AnnouncementInput['tone'])} className={inputCls}>
                        <option value="feature">New feature</option>
                        <option value="info">Update</option>
                        <option value="warning">Notice</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Priority</label>
                    <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className={inputCls} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Starts</label>
                    <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Ends</label>
                    <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
                    <div className="flex flex-wrap items-center gap-1.5">
                        {RUN_PRESETS.map((d) => (
                            <button type="button" key={d} onClick={() => runFor(d)} className="rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-accent">{d} days</button>
                        ))}
                        {endsAt && <button type="button" onClick={() => setEndsAt('')} className="text-[11px] text-muted-foreground underline">No end</button>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Deleted automatically once it ends. With no end it runs until switched off.</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={isActive} onCheckedChange={setIsActive} /> Live</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={dismissible} onCheckedChange={setDismissible} /> Users can dismiss</label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
                <Button type="submit" disabled={save.isPending} className="gap-2">
                    {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {initial ? 'Save changes' : 'Publish'}
                </Button>
            </div>
        </form>
    );
}
