import { redirect } from 'next/navigation';

export default async function SettingsRootPage() {
    redirect('/settings/providers');
}
