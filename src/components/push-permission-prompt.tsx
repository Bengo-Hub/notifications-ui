'use client';

import { Button } from '@/components/ui/base';
import { usePushRegistration } from '@/hooks/use-push-registration';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const DISMISS_KEY = 'whatsapp-inbox-push-prompt-dismissed';

function isDismissed(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * Contextual prompt shown inside the WhatsApp inbox (not globally) — asks for notification
 * permission only when the visitor is actually looking at the thing push notifications are for.
 * Renders nothing once granted/denied/unsupported/dismissed.
 */
export function PushPermissionPrompt() {
    const { status, subscribe } = usePushRegistration();
    const [dismissed, setDismissed] = useState(isDismissed);

    if (dismissed || status !== 'default') return null;

    const handleEnable = async () => {
        const ok = await subscribe();
        if (ok) toast.success('Notifications enabled — you’ll be alerted when a customer messages you.');
        else toast.error('Could not enable notifications. Check your browser permission settings.');
    };

    const dismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // no-op — worst case the prompt reappears next visit
        }
    };

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
            <Bell className="h-4 w-4 text-primary shrink-0" />
            <p className="flex-1 text-muted-foreground">
                Get notified on this device when a customer sends a new message.
            </p>
            <Button size="sm" onClick={handleEnable}>Enable</Button>
            <button
                type="button"
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={dismiss}
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
