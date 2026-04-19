"use client"

import React from 'react';
import { StorefrontMobileLayout } from './StorefrontMobileLayout';
import { StorefrontDesktopLayout } from './StorefrontDesktopLayout';
import { useStoreData } from '@/providers/storefront';

export function StorefrontResponsiveLayout({ children }: { children?: React.ReactNode }) {
  const { isDesktop, mounted } = useStoreData();

  if (!mounted) {
    return null;
  }
  
  if (isDesktop) {
    return <StorefrontDesktopLayout>{children}</StorefrontDesktopLayout>;
  }
  return <StorefrontMobileLayout>{children}</StorefrontMobileLayout>;
}
