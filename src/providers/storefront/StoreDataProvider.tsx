"use client"

import React, { createContext, useContext } from 'react';

import { useStoreSeo } from '@/hooks/storefront/useStoreSeo';
import { useStoreTheme } from '@/hooks/storefront/useStoreTheme';
import { useStorefrontData } from '@/hooks/storefront/useStorefrontData';
import { mergeWithDefaults, normalizeSections, validateSections } from '@/lib/storefront/sections';
import type { SectionSchema } from '@/types/storefront/sections';

type StoreDataContextValue = ReturnType<typeof useStorefrontData> & {
  sections: SectionSchema[];
};

const StoreDataContext = createContext<StoreDataContextValue | null>(null);

export function StoreDataProvider({
  subdomain,
  children,
}: {
  subdomain: string;
  children: React.ReactNode;
}) {
  const storefrontData = useStorefrontData(subdomain);

  useStoreTheme(storefrontData.template, storefrontData.merchant?.branding_settings);
  useStoreSeo(
    (storefrontData.merchant?.branding_settings as Record<string, unknown> | undefined)?.seo as Record<string, unknown> | undefined,
    storefrontData.merchant?.store_name
  );

  const brandingSections = (storefrontData.merchant?.branding_settings as Record<string, unknown> | undefined)?.sections as SectionSchema[] | undefined;
  const normalizedSections = normalizeSections(brandingSections);
  const sections = mergeWithDefaults(validateSections(normalizedSections));

  return (
    <StoreDataContext.Provider value={{ ...storefrontData, sections }}>
      {children}
    </StoreDataContext.Provider>
  );
}

export function useStoreDataContext() {
  const context = useContext(StoreDataContext);
  if (!context) {
    throw new Error('useStoreDataContext must be used within StoreDataProvider');
  }
  return context;
}
