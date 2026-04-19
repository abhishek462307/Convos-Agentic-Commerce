import type { StoreTemplate } from '@/lib/store-templates';
import type { BrandingSettings } from '@/types';
import type { LoaderConfig, ThemeTokens } from '@/types/storefront';

export function getPrimaryForeground(primaryColor: string) {
  const normalized = primaryColor.trim().replace('#', '');
  const hex = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return '#ffffff';
  }

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red) + (0.587 * green) + (0.114 * blue);

  return luminance > 186 ? '#111111' : '#ffffff';
}

export function resolveThemeTokens(template: StoreTemplate, primaryColor: string): ThemeTokens {
  const cardRadius = template.styles.product_card_style === 'rounded' ? '32px' : template.styles.product_card_style === 'pill' ? '9999px' : '4px';
  const cardRadiusSm = template.styles.product_card_style === 'rounded' ? '24px' : template.styles.product_card_style === 'pill' ? '9999px' : '2px';
  const fontHeading = template.styles.font_style === 'classic' ? "'Georgia', serif" : template.styles.font_style === 'playful' ? "'Comic Neue', cursive" : "'Inter', sans-serif";
  const fontBody = template.styles.font_style === 'classic' ? "'Georgia', serif" : "'Inter', sans-serif";
  const spacingSection = template.styles.spacing === 'airy' ? '80px' : template.styles.spacing === 'relaxed' ? '48px' : '32px';

  return {
    background: template.colors.background,
    cardBackground: template.colors.card_background,
    textPrimary: template.colors.text_primary,
    textSecondary: template.colors.text_secondary,
    border: template.colors.border,
    primary: primaryColor,
    primaryForeground: getPrimaryForeground(primaryColor),
    highlightColor: `${primaryColor}26`,
    fontHeading,
    fontBody,
    spacingSection,
    cardRadius,
    cardRadiusSm,
  };
}

export function applyThemeToDocument(tokens: ThemeTokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--primary', tokens.primary);
  root.style.setProperty('--primary-foreground', tokens.primaryForeground);
  root.style.setProperty('--highlight-color', tokens.highlightColor);
  root.style.setProperty('--store-bg', tokens.background);
  root.style.setProperty('--store-card-bg', tokens.cardBackground);
  root.style.setProperty('--store-text', tokens.textPrimary);
  root.style.setProperty('--store-text-muted', tokens.textSecondary);
  root.style.setProperty('--store-border', tokens.border);
  root.style.setProperty('--card-radius', tokens.cardRadius);
  root.style.setProperty('--card-radius-sm', tokens.cardRadiusSm);
  root.style.setProperty('--font-heading', tokens.fontHeading);
  root.style.setProperty('--font-body', tokens.fontBody);
  root.style.setProperty('--spacing-section', tokens.spacingSection);
}

export function resolveLoaderConfig(branding: BrandingSettings): LoaderConfig {
  return {
    style: branding.loader_style || 'spinner',
    logoUrl: branding.logo_url || null,
    logoUrlDesktop: branding.logo_url_desktop || null,
    logoWidthMobile: branding.logo_width_mobile || branding.logo_size || 80,
    logoHeightMobile: branding.logo_height_mobile || branding.logo_size || 80,
    logoWidthDesktop: branding.logo_width_desktop || 120,
    logoHeightDesktop: branding.logo_height_desktop || 40,
    primaryColor: branding.primary_color || '#008060'
  };
}
