'use client';

import { Badge, Button } from '@/components/ui/base';
import {
    useSyncWhatsAppProfileFromBranding,
    useUpdateWhatsAppProfile,
    useUploadWhatsAppPhoto,
    useWhatsAppProfile,
} from '@/hooks/use-whatsapp-profile';
import type { WhatsAppBusinessProfile } from '@/lib/api/whatsapp';
import { ImageUp, Loader2, Save, Sparkles, Store } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

// Meta's limits on the profile fields; the API enforces them too.
const MAX_ABOUT = 139;
const MAX_ADDRESS = 256;
const MAX_DESCRIPTION = 512;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Meta's business categories in plain words.
const CATEGORIES: { value: string; label: string }[] = [
    { value: '', label: 'Not set' },
    { value: 'RESTAURANT', label: 'Restaurant or food' },
    { value: 'GROCERY', label: 'Grocery' },
    { value: 'RETAIL', label: 'Shop or retail' },
    { value: 'APPAREL', label: 'Clothing' },
    { value: 'BEAUTY', label: 'Beauty, spa and salon' },
    { value: 'HEALTH', label: 'Medical and health' },
    { value: 'EDU', label: 'Education' },
    { value: 'FINANCE', label: 'Finance and banking' },
    { value: 'PROF_SERVICES', label: 'Professional services' },
    { value: 'HOTEL', label: 'Hotel and lodging' },
    { value: 'TRAVEL', label: 'Travel and transport' },
    { value: 'AUTO', label: 'Automotive' },
    { value: 'EVENT_PLAN', label: 'Events' },
    { value: 'ENTERTAIN', label: 'Entertainment' },
    { value: 'NONPROFIT', label: 'Non profit' },
    { value: 'GOVT', label: 'Public service' },
    { value: 'ALCOHOL', label: 'Alcoholic drinks' },
    { value: 'OTC_DRUGS', label: 'Over the counter medicine' },
    { value: 'ONLINE_GAMBLING', label: 'Online betting' },
    { value: 'PHYSICAL_GAMBLING', label: 'Betting shop' },
    { value: 'OTHER', label: 'Other' },
];

const FIELD_LABELS: Record<string, string> = {
    about: 'short intro', description: 'description', address: 'address', email: 'email', websites: 'website', photo: 'photo',
};

function nameStatus(status?: string): { label: string; variant: 'success' | 'warning' | 'error' | 'secondary'; help: string } {
    switch ((status ?? '').toUpperCase()) {
        case 'APPROVED':
        case 'AVAILABLE_WITHOUT_REVIEW':
            return { label: 'Approved', variant: 'success', help: 'Meta has accepted this name.' };
        case 'PENDING_REVIEW':
            return { label: 'In review', variant: 'warning', help: 'Meta is checking this name. This usually takes a day or two.' };
        case 'DECLINED':
            return {
                label: 'Rejected',
                variant: 'error',
                help: 'Meta did not accept this name. It has to match your registered business name or brand, without extra words. Contact support to change it.',
            };
        case 'EXPIRED':
            return { label: 'Expired', variant: 'error', help: 'The name approval has run out. Contact support to renew it.' };
        default:
            return { label: 'Not reviewed yet', variant: 'secondary', help: 'Meta reviews the name on its own once your business sends more messages.' };
    }
}

function quality(rating?: string): { label: string; variant: 'success' | 'warning' | 'error' | 'secondary' } {
    switch ((rating ?? '').toUpperCase()) {
        case 'GREEN': return { label: 'Good', variant: 'success' };
        case 'YELLOW': return { label: 'Fair', variant: 'warning' };
        case 'RED': return { label: 'Low', variant: 'error' };
        default: return { label: 'Not rated yet', variant: 'secondary' };
    }
}

function errorText(err: unknown, fallback: string): string {
    return (err as any)?.response?.data?.error ?? fallback;
}

type Form = { about: string; description: string; address: string; email: string; website1: string; website2: string; vertical: string };

function toForm(p?: WhatsAppBusinessProfile): Form {
    return {
        about: p?.about ?? '',
        description: p?.description ?? '',
        address: p?.address ?? '',
        email: p?.email ?? '',
        website1: p?.websites?.[0] ?? '',
        website2: p?.websites?.[1] ?? '',
        vertical: p?.vertical ?? '',
    };
}

const inputClass = 'w-full bg-accent/20 p-2.5 rounded-lg border border-border text-sm focus:ring-1 focus:ring-primary outline-none transition-all';

/**
 * What customers see for the business's own WhatsApp number: the name and its review, the photo
 * and the profile details. Shown on the WhatsApp card once a number is connected.
 */
export function WhatsAppBusinessProfileSection({ phoneNumberId }: { phoneNumberId?: string }) {
    const { data: profile, isLoading, error, refetch } = useWhatsAppProfile(phoneNumberId);
    const update = useUpdateWhatsAppProfile(phoneNumberId);
    const upload = useUploadWhatsAppPhoto(phoneNumberId);
    const sync = useSyncWhatsAppProfileFromBranding(phoneNumberId);
    const [form, setForm] = useState<Form>(toForm());
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) setForm(toForm(profile));
    }, [profile]);

    if (!phoneNumberId) return null;

    const set = (key: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    const save = () => {
        if (!form.about.trim()) {
            toast.error('Add a short intro: WhatsApp does not allow it to be empty.');
            return;
        }
        update.mutate(
            {
                about: form.about.trim(),
                description: form.description.trim(),
                address: form.address.trim(),
                email: form.email.trim(),
                websites: [form.website1, form.website2].map((w) => w.trim()).filter(Boolean),
                vertical: form.vertical,
            },
            {
                onSuccess: () => toast.success('Business profile saved'),
                onError: (err) => toast.error(errorText(err, 'Could not save the business profile')),
            },
        );
    };

    const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            toast.error('Use a JPG or PNG picture.');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            toast.error('The picture is larger than 5 MB.');
            return;
        }
        upload.mutate(file, {
            onSuccess: () => toast.success('Profile photo updated'),
            onError: (err) => toast.error(errorText(err, 'Could not update the photo')),
        });
    };

    const applyBranding = () => {
        sync.mutate(undefined, {
            onSuccess: (r) => {
                const filled = (r.filled ?? []).map((f) => FIELD_LABELS[f] ?? f);
                if (filled.length) toast.success(`Added your ${filled.join(', ')}`);
                else toast.info('Nothing to add: every detail is already filled in.');
                (r.warnings ?? []).forEach((w) => toast.warning(w));
            },
            onError: (err) => toast.error(errorText(err, 'Could not use your business details')),
        });
    };

    const name = nameStatus(profile?.name_status);
    const pendingName = profile?.new_display_name && profile.new_display_name !== profile.display_name ? nameStatus(profile.new_name_status) : null;
    const q = quality(profile?.quality_rating);
    const busy = update.isPending || upload.isPending || sync.isPending;

    return (
        <div className="mb-4 p-4 rounded-lg bg-card border border-border space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h4 className="text-sm font-bold flex items-center gap-1.5">
                        <Store className="h-4 w-4 text-primary" />
                        Business profile
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        What customers see when they open your WhatsApp chat.
                    </p>
                </div>
                <Button type="button" size="sm" variant="outline" className="gap-1.5 shrink-0" disabled={busy || isLoading || !!error} onClick={applyBranding}>
                    {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Use our logo and details
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading your WhatsApp profile...
                </div>
            ) : error ? (
                <div className="text-xs text-destructive flex items-center gap-2 flex-wrap">
                    {errorText(error, 'Could not load your WhatsApp profile.')}
                    <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
                </div>
            ) : (
                <>
                    <div className="flex gap-4 items-start flex-wrap">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-20 w-20 rounded-full overflow-hidden border border-border bg-accent/30 flex items-center justify-center">
                                {profile?.photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={profile.photo_url} alt="WhatsApp profile photo" className="h-full w-full object-cover" />
                                ) : (
                                    <Store className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPhoto} />
                            <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => fileRef.current?.click()}>
                                {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />}
                                {profile?.photo_url ? 'Change photo' : 'Add photo'}
                            </Button>
                        </div>
                        <div className="flex-1 min-w-[220px] space-y-2 text-sm">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold">{profile?.display_name || 'No name yet'}</span>
                                <Badge variant={name.variant}>{name.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{name.help}</p>
                            {pendingName && (
                                <p className="text-xs">
                                    New name <span className="font-bold">{profile?.new_display_name}</span>:{' '}
                                    <Badge variant={pendingName.variant}>{pendingName.label}</Badge>
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Customers see your name in their chats once Meta has verified your business and your
                                messaging limit has grown. Until then they see your number, with the name in small
                                print on your profile. Your photo and the details below show straight away.
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Number</span>
                                <span className="font-mono">{profile?.display_phone_number || phoneNumberId}</span>
                                <span className="text-muted-foreground ml-2">Message quality</span>
                                <Badge variant={q.variant}>{q.label}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Photo: JPG or PNG, square, at least 192 by 192 pixels (640 by 640 is best), up to 5 MB.
                                WhatsApp shows it as a circle, so keep your logo in the middle.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-muted-foreground">Short intro ({form.about.length}/{MAX_ABOUT})</label>
                            <input className={inputClass} maxLength={MAX_ABOUT} value={form.about} onChange={set('about')} placeholder="Fresh meals delivered daily" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-muted-foreground">Description ({form.description.length}/{MAX_DESCRIPTION})</label>
                            <textarea className={inputClass} rows={3} maxLength={MAX_DESCRIPTION} value={form.description} onChange={set('description')} placeholder="What you sell and who you serve" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-muted-foreground">Address</label>
                            <input className={inputClass} maxLength={MAX_ADDRESS} value={form.address} onChange={set('address')} placeholder="Street, town" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground">Email</label>
                            <input className={inputClass} type="email" maxLength={128} value={form.email} onChange={set('email')} placeholder="hello@yourbusiness.com" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground">Business type</label>
                            <select className={inputClass} value={form.vertical} onChange={set('vertical')}>
                                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground">Website</label>
                            <input className={inputClass} maxLength={256} value={form.website1} onChange={set('website1')} placeholder="yourbusiness.com" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground">Second website (optional)</label>
                            <input className={inputClass} maxLength={256} value={form.website2} onChange={set('website2')} placeholder="shop.yourbusiness.com" />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button size="sm" className="gap-2" disabled={busy} onClick={save}>
                            {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {update.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
