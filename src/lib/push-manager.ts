export const pushManager = {
    async isSupported(): Promise<boolean> {
        return (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window
        );
    },

    async getPermissionState(): Promise<NotificationPermission> {
        if (!this.isSupported()) return 'denied';
        return Notification.permission;
    },

    async requestPermission(): Promise<boolean> {
        if (!this.isSupported()) return false;
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    },

    async subscribeUser(vapidPublicKey: string): Promise<PushSubscription | null> {
        if (!this.isSupported()) return null;

        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) return existingSubscription;

        // Create new subscription
        return await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });
    },

    urlBase64ToUint8Array(base64String: string): ArrayBuffer {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray.buffer as ArrayBuffer;
    }
};
