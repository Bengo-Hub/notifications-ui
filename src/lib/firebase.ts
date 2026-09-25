// Browser push setup. Push is configured centrally in notifications-api; GET
// /api/v1/push/web-config says how this tenant's browsers register (the same endpoint every app
// uses), so this app carries no push build settings:
//   - kind "fcm": a Firebase project (tenant's own or the platform's) -> Firebase SDK token;
//   - kind "webpush": the platform's standard Web Push key -> browser PushSubscription.
// Secrets never leave the backend. Push off just means the prompt is not offered.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://notificationsapi.codevertexafrica.com').replace(/\/$/, '');

interface FirebaseWebConfig {
    api_key: string;
    auth_domain?: string;
    project_id: string;
    storage_bucket?: string;
    messaging_sender_id: string;
    app_id: string;
    vapid_key: string;
}

export type PushSetup =
    | { kind: 'fcm'; config: FirebaseWebConfig }
    | { kind: 'webpush'; vapidPublicKey: string };

let setupPromise: Promise<PushSetup | null> | null = null;
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/** How the signed-in tenant's browsers register for push, or null when push is off. */
export function loadPushSetup(): Promise<PushSetup | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (!setupPromise) {
        const tenant = localStorage.getItem('tenant_slug') ?? '';
        setupPromise = fetch(`${apiBaseUrl}/api/v1/push/web-config?tenant=${encodeURIComponent(tenant)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((body): PushSetup | null => {
                if (!body?.enabled) return null;
                if (body.kind === 'webpush' && body.vapid_public_key) {
                    return { kind: 'webpush', vapidPublicKey: body.vapid_public_key as string };
                }
                if (body.config) return { kind: 'fcm', config: body.config as FirebaseWebConfig };
                return null;
            })
            .catch(() => null);
    }
    return setupPromise;
}

export async function isPushConfigured(): Promise<boolean> {
    return (await loadPushSetup()) !== null;
}

/** Firebase messaging for a kind "fcm" setup. */
export function getFirebaseMessaging(cfg: FirebaseWebConfig): Messaging {
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
