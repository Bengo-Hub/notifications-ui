// Browser-only Firebase init for Web Push (FCM). Push is configured centrally in
// notifications-api (the tenant's own Firebase project, else the platform's): the browser config
// comes from GET /api/v1/push/web-config at runtime, the same endpoint every other app uses, so
// this app carries no Firebase build settings. The service account never leaves the backend.
// Not configured just means push notifications are unavailable, not a crash.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://notificationsapi.codevertexafrica.com').replace(/\/$/, '');

interface WebPushConfig {
    api_key: string;
    auth_domain?: string;
    project_id: string;
    storage_bucket?: string;
    messaging_sender_id: string;
    app_id: string;
    vapid_key: string;
}

let configPromise: Promise<WebPushConfig | null> | null = null;
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/** The Firebase browser config for the signed-in tenant, or null when push is not set up. */
export function loadWebPushConfig(): Promise<WebPushConfig | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (!configPromise) {
        const tenant = localStorage.getItem('tenant_slug') ?? '';
        configPromise = fetch(`${apiBaseUrl}/api/v1/push/web-config?tenant=${encodeURIComponent(tenant)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((body) => (body?.enabled ? (body.config as WebPushConfig) : null))
            .catch(() => null);
    }
    return configPromise;
}

export async function isFirebaseConfigured(): Promise<boolean> {
    return (await loadWebPushConfig()) !== null;
}

export async function getFirebaseVapidKey(): Promise<string> {
    return (await loadWebPushConfig())?.vapid_key ?? '';
}

/** Lazily initializes Firebase with the central config; null when push is not set up. */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
    const cfg = await loadWebPushConfig();
    if (!cfg) return null;
    if (!app) {
        app = getApps()[0] ?? initializeApp({
            apiKey: cfg.api_key,
            authDomain: cfg.auth_domain,
            projectId: cfg.project_id,
            storageBucket: cfg.storage_bucket,
            messagingSenderId: cfg.messaging_sender_id,
            appId: cfg.app_id,
        });
    }
    if (!messaging) {
        messaging = getMessaging(app);
    }
    return messaging;
}
