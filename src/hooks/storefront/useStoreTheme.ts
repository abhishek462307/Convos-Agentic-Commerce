"use client"

import { useEffect } from 'react';

import type { StoreTemplate } from '@/lib/store-templates';
import { applyThemeToDocument, getPrimaryForeground, resolveThemeTokens } from '@/lib/storefront';
import type { BrandingSettings } from '@/types';

export function useStoreTheme(
  template: StoreTemplate | undefined,
  branding: BrandingSettings | null | undefined
) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const primaryColor = branding?.primary_color || '#008060';

    if (template) {
      applyThemeToDocument(resolveThemeTokens(template, primaryColor));
      return;
    }

    document.documentElement.style.setProperty('--primary', primaryColor);
    document.documentElement.style.setProperty('--primary-foreground', getPrimaryForeground(primaryColor));
    document.documentElement.style.setProperty('--highlight-color', `${primaryColor}26`);
    document.documentElement.style.setProperty('--store-bg', '#ffffff');
    document.documentElement.style.setProperty('--store-card-bg', '#ffffff');
    document.documentElement.style.setProperty('--store-text', '#1a1a1a');
    document.documentElement.style.setProperty('--store-text-muted', '#6b7280');
    document.documentElement.style.setProperty('--store-border', '#e5e7eb');
    document.documentElement.style.setProperty('--card-radius', '32px');
    document.documentElement.style.setProperty('--card-radius-sm', '24px');
    document.documentElement.style.setProperty('--font-heading', "'Inter', sans-serif");
    document.documentElement.style.setProperty('--font-body', "'Inter', sans-serif");
    document.documentElement.style.setProperty('--spacing-section', '80px');
  }, [branding?.primary_color, template]);
}
