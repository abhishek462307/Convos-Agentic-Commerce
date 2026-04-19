"use client"

import { useEffect } from 'react';

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error is already logged server-side by Next.js
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-6">
          We hit an unexpected error loading this store. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 text-white rounded-full text-sm font-medium hover:opacity-90 transition-colors"
          style={{ background: 'var(--primary)' }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
