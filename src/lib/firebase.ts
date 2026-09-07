// Browser-only Firebase init for Web Push (FCM). All values here are public client config —
// meant to be read by Firebase's JS SDK, not secrets — the real secret (the service-account JSON
// fcm.go signs with) stays backend-only. Everything is optional: a tenant/deployment without
// Firebase configured just means push notifications don't work, not a crash.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';

export function isFirebaseConfigured(): boolean {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseVapidKey);
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/** Lazily initializes Firebase — only called from client code that already checked isFirebaseConfigured(). */
export function getFirebaseMessaging(): Messaging | null {
    if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;
    if (!app) {
        app = getApps()[0] ?? initializeApp(firebaseConfig);
    }
    if (!messaging) {
        messaging = getMessaging(app);
    }
    return messaging;
}
