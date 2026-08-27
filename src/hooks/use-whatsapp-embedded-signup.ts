'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

declare global {
    interface Window {
        FB?: {
            init: (params: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }) => void;
            login: (
                callback: (response: { authResponse?: { code?: string } | null; status?: string }) => void,
                options: { config_id: string; response_type: string; override_default_response_type: boolean; extras?: Record<string, unknown> }
            ) => void;
        };
        fbAsyncInit?: () => void;
    }
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID ?? '';
const META_EMBEDDED_SIGNUP_CONFIG_ID = process.env.NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID ?? '';
const FB_SDK_VERSION = 'v21.0';

let sdkLoadPromise: Promise<void> | null = null;

/** Loads Meta's JS SDK exactly once per page, regardless of how many components request it. */
function loadFacebookSdk(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.FB) return Promise.resolve();
    if (sdkLoadPromise) return sdkLoadPromise;

    sdkLoadPromise = new Promise((resolve) => {
        window.fbAsyncInit = () => {
            window.FB?.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: true, version: FB_SDK_VERSION });
            resolve();
        };
        if (document.getElementById('facebook-jssdk')) return;
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    });
    return sdkLoadPromise;
}

interface EmbeddedSignupResult {
    waba_id: string;
    phone_number_id: string;
}

/**
 * WhatsApp Embedded Signup — the Meta-recommended self-serve flow for a tenant to connect their
 * own WhatsApp Business phone number, via a JS SDK popup (no manual token/ID copy-paste, no
 * access to Meta Business Manager needed — that stays with CodeVertex as the Tech Provider).
 *
 * Requires two values only Meta can issue, both via environment variables:
 *  - NEXT_PUBLIC_META_APP_ID — CodeVertex's Meta App ID (App Dashboard → Settings → Basic).
 *  - NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID — generated once the App has Embedded Signup configured
 *    (App Dashboard → WhatsApp → Embedded Signup → Configurations), which itself requires Meta
 *    Business Verification + App Review for whatsapp_business_management/whatsapp_business_messaging
 *    at Advanced Access. Until both are set, `configured` is false and launchSignup is a no-op.
 *
 * On completion, posts {waba_id, phone_number_id} to the backend's
 * POST /billing/whatsapp/embedded-signup/complete, which uses the platform's own Meta credentials
 * (granted access automatically by the signup) to subscribe the webhook, register the number, and
 * save phone_number_id as this tenant's own provider setting — the same field the manual
 * phone_number_id form field already reads/writes.
 */
export function useWhatsAppEmbeddedSignup() {
    const [status, setStatus] = useState<'idle' | 'loading-sdk' | 'awaiting-popup' | 'completing'>('idle');
    const qc = useQueryClient();
    const resultRef = useRef<EmbeddedSignupResult | null>(null);

    const completeMutation = useMutation({
        mutationFn: (result: EmbeddedSignupResult) =>
            apiClient.post<{ message: string; phone_number_id: string }>(
                '/api/v1/billing/whatsapp/embedded-signup/complete',
                result
            ),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['settings', 'current', 'providers'] });
        },
    });

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.origin !== 'https://www.facebook.com') return;
            let data: any;
            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }
            if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
            if (data.event === 'FINISH' && data.data?.phone_number_id && data.data?.waba_id) {
                resultRef.current = { waba_id: data.data.waba_id, phone_number_id: data.data.phone_number_id };
                setStatus('completing');
                completeMutation.mutate(resultRef.current);
            } else if (data.event === 'CANCEL') {
                setStatus('idle');
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const launchSignup = useCallback(async () => {
        if (!META_APP_ID || !META_EMBEDDED_SIGNUP_CONFIG_ID) return;
        setStatus('loading-sdk');
        await loadFacebookSdk();
        setStatus('awaiting-popup');
        window.FB?.login(
            (response) => {
                if (!response.authResponse) setStatus('idle');
                // The FINISH/CANCEL postMessage (handled above) is what actually drives completion —
                // this callback alone only tells us the popup closed with SOME auth response, which
                // may arrive before or after the postMessage event.
            },
            {
                config_id: META_EMBEDDED_SIGNUP_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
            }
        );
    }, []);

    return {
        configured: !!META_APP_ID && !!META_EMBEDDED_SIGNUP_CONFIG_ID,
        missing: [
            !META_APP_ID && 'NEXT_PUBLIC_META_APP_ID',
            !META_EMBEDDED_SIGNUP_CONFIG_ID && 'NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID',
        ].filter(Boolean) as string[],
        launchSignup,
        status,
        isCompleting: completeMutation.isPending || status === 'completing',
        completeError: completeMutation.error as Error | null,
        completeSuccess: completeMutation.isSuccess,
    };
}
