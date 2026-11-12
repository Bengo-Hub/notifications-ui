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
// Keep in step with the Graph API version on Platform > Providers > WhatsApp (v26.0 since
// 2026-11-12); NEXT_PUBLIC_META_SDK_VERSION overrides it without a code change.
const FB_SDK_VERSION = process.env.NEXT_PUBLIC_META_SDK_VERSION || 'v26.0';

// Meta's number registration alone can take over 14 seconds, past the client's 15 second
// default, which cancelled the signup halfway (2026-11-12).
const COMPLETE_TIMEOUT_MS = 120_000;

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

interface SignupIds {
    waba_id: string;
    phone_number_id: string;
}

interface EmbeddedSignupResult extends SignupIds {
    /** One-time code from FB.login; the backend exchanges it for the business token. */
    code: string;
}

/** Meta posts the popup's session events from facebook.com (www. or web.). */
function isFacebookOrigin(origin: string): boolean {
    try {
        const host = new URL(origin).hostname;
        return origin.startsWith('https://') && (host === 'facebook.com' || host.endsWith('.facebook.com'));
    } catch {
        return false;
    }
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
 * Completion needs two things that arrive separately and in either order: the one-time `code`
 * from the FB.login callback and the {waba_id, phone_number_id} from the popup's FINISH message.
 * Once both are in, they go together to POST /billing/whatsapp/embedded-signup/complete, which
 * exchanges the code for the business token and uses it to subscribe the webhook, register the
 * number and save it as this tenant's own WhatsApp settings. Without the code the backend can
 * only use the platform token, which Meta refuses on a WABA the customer just created.
 */
export function useWhatsAppEmbeddedSignup() {
    const [status, setStatus] = useState<'idle' | 'loading-sdk' | 'awaiting-popup' | 'completing'>('idle');
    const qc = useQueryClient();
    const codeRef = useRef<string | null>(null);
    const idsRef = useRef<SignupIds | null>(null);
    const sentRef = useRef(false);

    const completeMutation = useMutation({
        mutationFn: (result: EmbeddedSignupResult) =>
            apiClient.post<{ message: string; phone_number_id: string }>(
                '/api/v1/billing/whatsapp/embedded-signup/complete',
                result,
                { timeout: COMPLETE_TIMEOUT_MS }
            ),
        onSuccess: () => {
            setStatus('idle');
            qc.invalidateQueries({ queryKey: ['settings', 'current', 'providers'] });
        },
        // Without this the button stayed on "Finishing setup" after a success or failure.
        onError: () => setStatus('idle'),
    });

    const resetMutation = completeMutation.reset;

    // Sends once, when both the code and the IDs have arrived.
    const tryComplete = () => {
        const code = codeRef.current;
        const ids = idsRef.current;
        if (!code || !ids || sentRef.current) return;
        sentRef.current = true;
        setStatus('completing');
        completeMutation.mutate({ code, ...ids });
    };
    const tryCompleteRef = useRef(tryComplete);
    tryCompleteRef.current = tryComplete;

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (!isFacebookOrigin(event.origin)) return;
            let data: any;
            try {
                data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            } catch {
                return;
            }
            if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
            // FINISH, or a FINISH_* variant (for example an existing WhatsApp Business app number).
            if (typeof data.event === 'string' && data.event.startsWith('FINISH') && data.data?.phone_number_id && data.data?.waba_id) {
                idsRef.current = { waba_id: String(data.data.waba_id), phone_number_id: String(data.data.phone_number_id) };
                tryCompleteRef.current();
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
        codeRef.current = null;
        idsRef.current = null;
        sentRef.current = false;
        resetMutation();
        setStatus('loading-sdk');
        await loadFacebookSdk();
        setStatus('awaiting-popup');
        window.FB?.login(
            (response) => {
                const code = response.authResponse?.code;
                if (!code) {
                    setStatus('idle');
                    return;
                }
                codeRef.current = code;
                tryCompleteRef.current();
            },
            {
                config_id: META_EMBEDDED_SIGNUP_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
            }
        );
    }, [resetMutation]);

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
