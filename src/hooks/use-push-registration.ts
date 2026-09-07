'use client';

import { useCallback, useEffect, useState } from 'react';
import { pushManager } from '@/lib/push-manager';
import { deviceTokensApi } from '@/lib/api/device-tokens';

export type PushRegistrationStatus = 'unsupported' | 'default' | 'denied' | 'granted' | 'registering';

/**
 * Orchestrates: support check -> permission prompt -> Firebase getToken -> POST /push/tokens.
 * Deliberately does nothing automatically on mount beyond checking current state — the actual
 * subscribe flow is user-initiated (see PushPermissionPrompt), since requesting notification
 * permission on page load is a well-known way to get it permanently denied.
 */
export function usePushRegistration() {
    const [status, setStatus] = useState<PushRegistrationStatus>('default');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const supported = await pushManager.isSupported();
            if (cancelled) return;
            if (!supported) {
                setStatus('unsupported');
                return;
            }
            const perm = await pushManager.getPermissionState();
            if (cancelled) return;
            setStatus(perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'default');
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const subscribe = useCallback(async (): Promise<boolean> => {
        setStatus('registering');
        const granted = await pushManager.requestPermission();
        if (!granted) {
            setStatus('denied');
            return false;
        }
        const token = await pushManager.subscribeUser();
        if (!token) {
            setStatus('denied');
            return false;
        }
        try {
            await deviceTokensApi.register(token);
            setStatus('granted');
            return true;
        } catch {
            setStatus('default');
            return false;
        }
    }, []);

    return { status, subscribe };
}
