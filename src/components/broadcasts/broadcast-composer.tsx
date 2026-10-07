'use client';

import { Button } from '@/components/ui/base';
import { useSaveBroadcast, useWhatsAppTemplates } from '@/hooks/use-broadcasts';
import { broadcastsApi, type Broadcast, type BroadcastInput, type Channel, type SendScope } from '@/lib/api/broadcasts';
import { cn } from '@/lib/utils';
import { Eye, Loader2, Save, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiError, CHANNEL_LABELS, fromLocalInput, inputCls, KIND_LABELS, toLocalInput, TOKENS } from './shared';

const SEND_CHANNELS: Channel[] = ['email', 'sms', 'whatsapp', 'in_app'];

interface Props {
    scope: SendScope;
    initial?: Broadcast;
    onDone: (saved?: Broadcast) => void;
}

/**
 * Write or edit a broadcast. Saving keeps it as a draft; "Save and send for approval" moves it
 * to the approval queue. Nothing is sent until someone with the approve permission approves it.
 */
export function BroadcastComposer({ scope, initial, onDone }: Props) {
    const save = useSaveBroadcast(scope);
    const { data: templates = [] } = useWhatsAppTemplates(scope);
    const c = initial?.content ?? {};

    const [title, setTitle] = useState(initial?.title ?? '');
    const [kind, setKind] = useState<BroadcastInput['kind']>(initial?.kind ?? (scope === 'platform' ? 'announcement' : 'marketing'));
    const [channels, setChannels] = useState<Channel[]>(initial?.channels ?? ['email']);
    const [audienceType, setAudienceType] = useState<string>(
        (initial?.audience?.type as string) ?? (scope === 'platform' ? 'platform_tenants' : 'tenant_customers'),
    );
    const [segmentId, setSegmentId] = useState<string>((initial?.audience?.segment_id as string) ?? '');
    const [plans, setPlans] = useState<string>(((initial?.audience?.filters?.plan as string[]) ?? []).join(', '));
    const [subject, setSubject] = useState(c.email?.subject ?? '');
    const [body, setBody] = useState(c.email?.body ?? '');
    const [sms, setSms] = useState(c.sms?.body ?? '');
    const [waTemplate, setWaTemplate] = useState(c.whatsapp?.template ?? 'broadcast_update_v1');
    const [waMessage, setWaMessage] = useState(c.whatsapp?.message ?? '');
    const [bannerTitle, setBannerTitle] = useState(c.in_app?.title ?? '');
    const [bannerSummary, setBannerSummary] = useState(c.in_app?.summary ?? '');
    const [bannerDays, setBannerDays] = useState(c.in_app?.days ?? 7);
    const [sendAt, setSendAt] = useState(toLocalInput(initial?.send_at));
    const [attested, setAttested] = useState(Boolean(initial?.metadata?.consent_attested));
    const [preview, setPreview] = useState<Record<string, string> | null>(null);
    const [previewing, setPreviewing] = useState(false);

    const templateParams = useMemo(() => templates.find((t) => t.name === waTemplate)?.params ?? [], [templates, waTemplate]);
    const marketing = kind !== 'service_notice';
    const isCustomers = audienceType === 'tenant_customers';

    const toggle = (ch: Channel) => setChannels((prev) => (prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]));

    const input = (): BroadcastInput => {
        const content: BroadcastInput['content'] = {};
        if (channels.includes('email')) content.email = { subject, body };
        if (channels.includes('sms')) content.sms = { body: sms };
        if (channels.includes('whatsapp')) content.whatsapp = { template: waTemplate, params: templateParams, message: waMessage };
        if (channels.includes('in_app')) content.in_app = { title: bannerTitle, summary: bannerSummary, days: bannerDays };
        const audience: BroadcastInput['audience'] = channels.length === 1 && channels[0] === 'in_app' ? {} : { type: audienceType };
        if (audienceType === 'tenant_customers' && segmentId.trim()) audience.segment_id = segmentId.trim();
        const planList = plans.split(',').map((p) => p.trim()).filter(Boolean);
        if (audienceType === 'platform_tenants' && planList.length) audience.filters = { plan: planList };
        return { title, kind, channels, content, audience, send_at: fromLocalInput(sendAt), consent_attested: attested };
    };

    const runPreview = async () => {
        setPreviewing(true);
        try {
            const texts: Record<string, string> = {};
            if (channels.includes('email')) { texts['email.subject'] = subject; texts['email.body'] = body; }
            if (channels.includes('sms')) texts['sms.body'] = sms;
            if (channels.includes('whatsapp') && waMessage) texts['whatsapp.message'] = waMessage;
            const res = await broadcastsApi.preview(scope, texts);
            setPreview(res.rendered);
        } catch (err) {
            toast.error(apiError(err, 'Could not preview the message'));
        } finally {
            setPreviewing(false);
        }
    };

    const submit = async (forApproval: boolean) => {
        try {
            const saved = await save.mutateAsync({ id: initial?.id, body: input() });
            if (forApproval) {
                if (saved.status === 'draft' || saved.status === 'rejected') {
                    await broadcastsApi.act(scope, saved.id, 'submit');
                }
                toast.success('Saved and sent for approval');
            } else {
                toast.success('Draft saved');
            }
            onDone(saved);
        } catch (err) {
            toast.error(apiError(err, 'Could not save the message'));
        }
    };

    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold">Name</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="New product launch, October" maxLength={160} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Type</label>
                    <select value={kind} onChange={(e) => setKind(e.target.value as BroadcastInput['kind'])} className={inputCls}>
                        {Object.entries(KIND_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-3">
                {marketing
                    ? 'Greetings, offers and announcements are marketing: only people who agreed to hear from you get them, and every message carries an opt-out.'
                    : 'Service notices (planned maintenance, changes to how you work) reach everyone who has not blocked you completely.'}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Who gets it</label>
                    {scope === 'platform' ? (
                        <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)} className={inputCls}>
                            <option value="platform_tenants">All active tenants</option>
                        </select>
                    ) : (
                        <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)} className={inputCls}>
                            <option value="tenant_customers">My customers</option>
                            <option value="tenant_users">My staff</option>
                        </select>
                    )}
                </div>
                {audienceType === 'tenant_customers' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Segment <span className="font-normal text-muted-foreground">(optional, from MarketFlow)</span></label>
                        <input value={segmentId} onChange={(e) => setSegmentId(e.target.value)} className={inputCls} placeholder="All customers who agreed to messages" />
                    </div>
                )}
                {audienceType === 'platform_tenants' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Plans <span className="font-normal text-muted-foreground">(optional, comma separated)</span></label>
                        <input value={plans} onChange={(e) => setPlans(e.target.value)} className={inputCls} placeholder="Every plan" />
                    </div>
                )}
            </div>
            {audienceType === 'platform_tenants' && (
                <p className="text-[11px] text-muted-foreground -mt-3">Each tenant gets one copy per channel: owners and admins with verified contacts first, then the business contact, then the main branch.</p>
            )}

            <div className="space-y-1.5">
                <label className="text-xs font-semibold">Channels</label>
                <div className="flex flex-wrap gap-2">
                    {SEND_CHANNELS.map((ch) => (
                        <button type="button" key={ch} onClick={() => toggle(ch)}
                            className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                channels.includes(ch) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent')}>
                            {CHANNEL_LABELS[ch]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-lg border border-border bg-accent/10 p-3 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Placeholders: </span>
                {TOKENS.map((t, i) => <span key={t.token} title={t.hint}>{i > 0 && ', '}<code>{t.token}</code></span>)}
            </div>

            {channels.includes('email') && (
                <fieldset className="space-y-3 rounded-lg border border-border p-4">
                    <legend className="px-1 text-xs font-semibold">Email</legend>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Subject" />
                    <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} className={inputCls}
                        placeholder={'Dear {first_name},\n\nWrite your message. Leave a blank line between paragraphs.'} />
                    {marketing && <p className="text-[11px] text-muted-foreground">An unsubscribe link and one-click unsubscribe headers are added for you.</p>}
                </fieldset>
            )}

            {channels.includes('sms') && (
                <fieldset className="space-y-2 rounded-lg border border-border p-4">
                    <legend className="px-1 text-xs font-semibold">SMS</legend>
                    <textarea rows={3} value={sms} onChange={(e) => setSms(e.target.value)} className={inputCls} placeholder="Dear {first_name}, ..." />
                    <p className="text-[11px] text-muted-foreground">
                        {sms.length} characters{marketing ? ', plus "Reply STOP to opt out"' : ''}. Every 160 characters (70 with emoji) is one SMS credit per person.
                    </p>
                </fieldset>
            )}

            {channels.includes('whatsapp') && (
                <fieldset className="space-y-2 rounded-lg border border-border p-4">
                    <legend className="px-1 text-xs font-semibold">WhatsApp</legend>
                    <select value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} className={inputCls}>
                        {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                        WhatsApp only sends wording Meta has approved. This template fills in: {templateParams.join(', ') || 'nothing'}.
                        {marketing && ' It has a "Stop promotions" button.'}
                    </p>
                    {templateParams.includes('message') && (
                        <textarea rows={3} value={waMessage} onChange={(e) => setWaMessage(e.target.value)} className={inputCls}
                            placeholder="Your message (no links; links go on buttons)" />
                    )}
                </fieldset>
            )}

            {channels.includes('in_app') && (
                <fieldset className="space-y-2 rounded-lg border border-border p-4">
                    <legend className="px-1 text-xs font-semibold">Dashboard banner</legend>
                    <input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} className={inputCls} placeholder="Banner title" maxLength={120} />
                    <textarea rows={2} value={bannerSummary} onChange={(e) => setBannerSummary(e.target.value)} className={inputCls} placeholder="One or two sentences" />
                    <label className="flex items-center gap-2 text-xs">
                        Show for
                        <input type="number" min={1} max={90} value={bannerDays} onChange={(e) => setBannerDays(Number(e.target.value) || 7)} className={cn(inputCls, 'w-20')} />
                        days
                    </label>
                </fieldset>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Send at <span className="font-normal text-muted-foreground">(empty: as soon as approved)</span></label>
                    <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className={inputCls} />
                    {marketing && <p className="text-[11px] text-muted-foreground">Marketing messages go out between 08:00 and 20:00 only, paced to stay within each provider&apos;s limits.</p>}
                </div>
                {isCustomers && marketing && (
                    <label className="flex items-start gap-2 text-xs pt-6">
                        <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5" />
                        <span>Customers added before consent was recorded also agreed to hear from us. Without this, only customers with recorded consent get it.</span>
                    </label>
                )}
            </div>

            {preview && (
                <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">Preview for a sample recipient</p>
                    {Object.entries(preview).filter(([k]) => k !== 'sms.body').map(([k, v]) => (
                        <div key={k}>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.replace('.', ' ')}</p>
                            <p className="whitespace-pre-wrap">{v}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => onDone()}>Cancel</Button>
                <Button type="button" variant="outline" onClick={runPreview} disabled={previewing} className="gap-2">
                    {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview
                </Button>
                <Button type="button" variant="outline" onClick={() => submit(false)} disabled={save.isPending} className="gap-2">
                    <Save className="h-4 w-4" /> Save draft
                </Button>
                <Button type="button" onClick={() => submit(true)} disabled={save.isPending} className="gap-2">
                    {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Save and send for approval
                </Button>
            </div>
        </div>
    );
}
