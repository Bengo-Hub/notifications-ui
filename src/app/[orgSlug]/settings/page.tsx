import { redirect } from 'next/navigation';

export default async function SettingsRootPage({ params }: { params: Promise<{ orgSlug: string }> }) {
    const { orgSlug } = await params;
    // Default settings page is Providers
    redirect(`/${orgSlug}/settings/providers`);
}
