import { Suspense } from 'react';
import SetupPageClient from './SetupPageClient';

export default function InitialSetupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>}>
      <SetupPageClient />
    </Suspense>
  );
}
