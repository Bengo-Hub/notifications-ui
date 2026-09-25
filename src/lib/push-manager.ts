import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging, isPushConfigured, loadPushSetup } from './firebase';

/** base64url VAPID key to the byte array PushManager.subscribe expects. */
function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
    const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(padded);
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

export interface PushDevice {
    /** FCM registration token, or the browser PushSubscription as JSON. */
    token: string;
    provider: 'fcm' | 'webpush';
}

export const pushManager = {
    async isSupported(): Promise<boolean> {
        return (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            (await isPushConfigured())
        );
    },

    async getPermissionState(): Promise<NotificationPermission> {
        if (!(await this.isSupported())) return 'denied';
        return Notification.permission;
    },

    async requestPermission(): Promise<boolean> {
        if (!(await this.isSupported())) return false;
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    },

    /**
     * Registers the shared offline-shell service worker (public/sw.js, not auto-registered by
     * next-pwa, which is disabled here) and gets this device's push token the way the server says:
     * an FCM token (kind "fcm") or a standard Web Push subscription (kind "webpush"). The result
     * goes straight to POST /push/tokens with its provider.
     */
    async subscribeUser(): Promise<PushDevice | null> {
        const setup = await loadPushSetup();
        if (!setup || !(await this.isSupported())) return null;

        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        try {
            if (setup.kind === 'webpush') {
                const sub =
                    (await registration.pushManager.getSubscription()) ??
                    (await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(setup.vapidPublicKey),
                    }));
                return { token: JSON.stringify(sub.toJSON()), provider: 'webpush' };
            }
            const token = await getToken(getFirebaseMessaging(setup.config), {
                vapidKey: setup.config.vapid_key,
                serviceWorkerRegistration: registration,
            });
            return token ? { token, provider: 'fcm' } : null;
        } catch {
            return null;
        }
    },
};
