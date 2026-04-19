"use client"

import React, { createContext, useContext } from 'react';

import { useStorefrontAuth } from '@/hooks/storefront/useStorefrontAuth';
import { useStorefrontViewport } from '@/hooks/storefront/useStorefrontViewport';

type StoreSessionContextValue = {
  subdomain: string;
} & ReturnType<typeof useStorefrontAuth> &
  ReturnType<typeof useStorefrontViewport>;

const StoreSessionContext = createContext<StoreSessionContextValue | null>(null);

export function StoreSessionProvider({
  subdomain,
  children,
}: {
  subdomain: string;
  children: React.ReactNode;
}) {
  const auth = useStorefrontAuth(subdomain);
  const viewport = useStorefrontViewport();

  return (
    <StoreSessionContext.Provider value={{ subdomain, ...auth, ...viewport }}>
      {children}
    </StoreSessionContext.Provider>
  );
}

export function useStoreSessionContext() {
  const context = useContext(StoreSessionContext);
  if (!context) {
    throw new Error('useStoreSessionContext must be used within StoreSessionProvider');
  }
  return context;
}
