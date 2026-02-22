import { redirect } from 'next/navigation';

export default async function OrgRootPage({ params }: { params: Promise<{ orgSlug: string }> }) {
    const { orgSlug } = await params;
    // Redirect organization root to dashboard
    redirect(`/${orgSlug}/dashboard`);
}
