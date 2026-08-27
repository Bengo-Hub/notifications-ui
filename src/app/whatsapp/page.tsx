import { redirect } from 'next/navigation';

// Convenience redirect — the real page is /billing/whatsapp, but /whatsapp is an easy URL to
// expect/type directly, so send it to the right place instead of a dead end.
export default function WhatsAppRedirectPage() {
    redirect('/billing/whatsapp');
}
