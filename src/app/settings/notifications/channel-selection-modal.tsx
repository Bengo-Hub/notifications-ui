'use client';

import { Button } from '@/components/ui/base';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import type { NotificationPreference } from '@/lib/api/settings';
import { Loader2, Mail, MessageCircle, MessageSquare, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

const CHANNEL_META: Record<string, { label: string; icon: typeof Mail }> = {
    email: { label: 'Email', icon: Mail },
    sms: { label: 'SMS', icon: MessageSquare },
    whatsapp: { label: 'WhatsApp', icon: MessageCircle },
    push: { label: 'Push', icon: Smartphone },
};

/**
 * Reusable channel-selection form, opened per row from the Notification Preferences table —
 * lets a tenant pick WHICH of a notification type's available channels it actually goes out on
 * (e.g. "Payment successful" has both email and SMS templates; a tenant may want only email).
 * Available channels come from the row itself (server-derived from which template files exist);
 * this only ever narrows that set, it can't invent a channel with no template.
 */
export function ChannelSelectionModal({
    pref,
    onClose,
    onSave,
    saving,
}: {
    pref: NotificationPreference | null;
    onClose: () => void;
    onSave: (key: string, channels: string[]) => void;
    saving: boolean;
}) {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (pref) setSelected(new Set(pref.enabledChannels));
    }, [pref]);

    if (!pref) return null;

    const toggle = (channel: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(channel)) next.delete(channel);
            else next.add(channel);
            return next;
        });
    };

    return (
        <Modal
            open={!!pref}
            onClose={onClose}
            title={pref.label}
            description="Choose which channels this notification actually goes out on."
        >
            <div className="space-y-4">
                {pref.channels.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                        No channel templates exist for this notification type yet.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {pref.channels.map((channel) => {
                            const meta = CHANNEL_META[channel] ?? { label: channel, icon: Mail };
                            const Icon = meta.icon;
                            const checked = selected.has(channel);
                            return (
                                <label
                                    key={channel}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                                        checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/20'
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggle(channel)}
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{meta.label}</span>
                                </label>
                            );
                        })}
                    </div>
                )}
                {selected.size === 0 && pref.channels.length > 0 && (
                    <p className="text-xs text-amber-600">
                        No channels selected — this notification won&apos;t be delivered at all, even if enabled above.
                    </p>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button
                        size="sm"
                        disabled={saving}
                        onClick={() => onSave(pref.key, [...selected])}
                    >
                        {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Save
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
