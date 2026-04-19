"use client"

import React from 'react';

import { StoreCartProvider } from './StoreCartProvider';
import { StoreChatProvider } from './StoreChatProvider';
import { StoreDataProvider } from './StoreDataProvider';
import { StoreSessionProvider } from './StoreSessionProvider';
import { StorefrontUIProvider } from './StorefrontUIProvider';

export function StorefrontProviders({
  subdomain,
  children,
}: {
  subdomain: string;
  children: React.ReactNode;
}) {
  return (
    <StoreSessionProvider subdomain={subdomain}>
      <StoreDataProvider subdomain={subdomain}>
        <StoreCartProvider>
          <StoreChatProvider>
            <StorefrontUIProvider>
              {children}
            </StorefrontUIProvider>
          </StoreChatProvider>
        </StoreCartProvider>
      </StoreDataProvider>
    </StoreSessionProvider>
  );
}
