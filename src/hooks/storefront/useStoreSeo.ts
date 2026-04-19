"use client"

import { useEffect } from 'react';

import { applyStoreSeo } from '@/lib/storefront';

export function useStoreSeo(
  seo: Record<string, unknown> | null | undefined,
  storeName: string | null | undefined
) {
  useEffect(() => {
    if (!storeName) {
      return;
    }

    applyStoreSeo((seo as Record<string, unknown>) || {}, storeName);
  }, [seo, storeName]);
}
