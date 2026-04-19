"use client"

import React from 'react';

import { StorefrontProviders } from '@/providers/storefront';
import { StorefrontResponsiveLayout } from './components/StorefrontResponsiveLayout';
import { StorefrontOverlays } from './components/StorefrontOverlays';
import { StorefrontSkeleton } from '@/components/StoreSkeletons';
import { StorefrontError } from './components/StorefrontError';
import { useStoreData } from '@/providers/storefront';

function StorefrontContent({ children }: { children?: React.ReactNode }) {
  const { merchant, loading, storeLoadError, fetchStoreData } = useStoreData();

  if (loading) return <StorefrontSkeleton />;
  if (!merchant) return <StorefrontError errorType={storeLoadError} onRetry={fetchStoreData} />;

  return (
    <div
      className="h-[100dvh] font-sans flex flex-col overflow-x-clip relative"
      style={{ background: 'var(--store-bg, #f6f6f7)', color: 'var(--store-text)' }}
    >
      <StorefrontResponsiveLayout>{children}</StorefrontResponsiveLayout>
      <StorefrontOverlays />
    </div>
  );
}

export default function StorefrontShell({ subdomain, children }: { subdomain: string; children?: React.ReactNode }) {
  return (
    <StorefrontProviders subdomain={subdomain}>
      <StorefrontContent>{children}</StorefrontContent>
    </StorefrontProviders>
  );
}
