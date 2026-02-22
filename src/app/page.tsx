import { redirect } from 'next/navigation';

export default function RootPage() {
  // Always redirect platform-level requests to the default platform owner slug
  // or show a landing page. For now, we redirect to codevertex.
  redirect('/codevertex');
}
