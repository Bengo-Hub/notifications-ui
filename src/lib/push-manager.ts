import { getToken } from 'firebase/messaging';
import { firebaseVapidKey, getFirebaseMessaging, isFirebaseConfigured } from './firebase';

export const pushManager = {
    async isSupported(): Promise<boolean> {
        return (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            isFirebaseConfigured()
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
     * Registers the shared offline-shell service worker (public/sw.js — not auto-registered by
     * next-pwa, which is disabled here) then asks Firebase for an FCM registration token scoped
     * to it. Returns the token string, directly compatible with POST /push/tokens — NOT a raw
     * PushSubscription object (the previous implementation here built one via
     * registration.pushManager.subscribe(), which the FCM-based backend can't send to at all).
     */
    async subscribeUser(): Promise<string | null> {
        if (!(await this.isSupported())) return null;

        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const messaging = getFirebaseMessaging();
        if (!messaging) return null;

        try {
            return await getToken(messaging, {
                vapidKey: firebaseVapidKey,
                serviceWorkerRegistration: registration,
            });
        } catch {
            return null;
        }
    },
};
