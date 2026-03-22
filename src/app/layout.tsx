import '@/app/globals.css';
import { AppProviders } from '@/components/app-providers';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ReactNode } from 'react';

const geistSans = Geist({
    subsets: ['latin'],
    variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
    subsets: ['latin'],
    variable: '--font-geist-mono',
});

export const metadata: Metadata = {
    title: {
        default: 'Codevertex Notifications',
        template: '%s | Codevertex Notifications',
    },
    description: 'Multi-channel notification management platform',
    icons: {
        icon: '/favicon.svg',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Notifications',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: dark)', color: '#43170d' },
        { color: '#6b2a1b' },
    ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-dvh overflow-x-hidden`}>
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    );
}
