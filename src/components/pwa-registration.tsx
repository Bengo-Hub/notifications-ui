'use client';

import { Button } from '@/components/ui/base';
import { pushManager } from '@/lib/push-manager';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const PWA_PROMPT_DISMISS_KEY = 'notifications-ui-pwa-prompt-dismissed';

function shouldShowPrompt(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const dismissed = localStorage.getItem(PWA_PROMPT_DISMISS_KEY);
        if (!dismissed) return true;
        const ts = parseInt(dismissed, 10);
        if (Number.isNaN(ts)) return true;
        return Date.now() - ts >= 30 * 60 * 1000; // Re-prompt after 30 min if not installed
    } catch {
        return true;
    }
}

export function PWARegistration() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstall, setShowInstall] = useState(false);

    useEffect(() => {
        // 1. Handle PWA Installation – show at most once per day
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstall(shouldShowPrompt());
        });

        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setShowInstall(false);
            toast.success('TruLoad Notifications installed successfully!');
        });

        // 2. Initialize Push Manager
        initPush();
    }, []);

    const initPush = async () => {
        const isSupported = await pushManager.isSupported();
        if (!isSupported) return;

        const permission = await pushManager.getPermissionState();
        if (permission === 'default') {
            // We don't prompt automatically on load, but we could show a subtle UI
        }
    };

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstall(false);
        }
    };

    const handlePushSubscription = async () => {
        try {
            const granted = await pushManager.requestPermission();
            if (!granted) {
                toast.error('Notification permission denied');
                return;
            }

            // VAPID Public Key from environment or platform config
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BF9y-vP5v...'; // Placeholder
            const subscription = await pushManager.subscribeUser(vapidKey);

            if (subscription) {
                // Here we would sync with backend
                console.log('Push subscription:', subscription);
                toast.success('Real-time alerts enabled!');
            }
        } catch (error) {
            console.error('Push error:', error);
            toast.error('Failed to enable push notifications');
        }
    };

    if (!showInstall) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Download className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">Install Notifications</p>
                    <p className="text-xs text-muted-foreground truncate">Add to home screen for real-time alerts.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                        setShowInstall(false);
                        try { localStorage.setItem(PWA_PROMPT_DISMISS_KEY, String(Date.now())); } catch { /* no-op */ }
                    }}>Later</Button>
                    <Button size="sm" onClick={handleInstall} className="shadow-lg shadow-primary/20">Install</Button>
                </div>
            </div>
        </div>
    );
}
