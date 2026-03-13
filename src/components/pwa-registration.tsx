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
        if (typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true))) return;

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
        <div
            className="fixed bottom-4 left-3 right-3 sm:left-4 sm:right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 max-w-full"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)' }}
        >
            <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Download className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold sm:text-base">Install Notifications</p>
                    <p className="text-xs text-muted-foreground truncate sm:text-sm">Add to home screen for real-time alerts.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="ghost" size="sm" className="min-h-[44px] flex-1 sm:flex-none touch-manipulation" onClick={() => {
                        setShowInstall(false);
                        try { localStorage.setItem(PWA_PROMPT_DISMISS_KEY, String(Date.now())); } catch { /* no-op */ }
                    }}>Later</Button>
                    <Button size="sm" onClick={handleInstall} className="shadow-lg shadow-primary/20 min-h-[44px] flex-1 sm:flex-none touch-manipulation">Install</Button>
                </div>
            </div>
        </div>
    );
}
