/// <reference lib="webworker" />

const _swDefault = null;
export default _swDefault;
declare let self: ServiceWorkerGlobalScope;

// Custom Service Worker for Push Notifications
self.addEventListener('push', (event: PushEvent) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options: NotificationOptions = {
            body: data.body || 'New notification',
            icon: '/logo.svg',
            badge: '/logo.svg',
            data: {
                url: data.url || '/',
            },
            tag: data.tag || 'general-notification'
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'TruLoad', options)
        );
    } catch (error) {
        console.error('Push event error:', error);
    }
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return (client as WindowClient).focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

// Handle PWA updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
