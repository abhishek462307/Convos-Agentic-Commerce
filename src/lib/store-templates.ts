export interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  preview_image: string;
  category: 'minimal' | 'bold' | 'elegant' | 'playful';
  primary_color?: string;
  styles: {
    header_style: 'floating' | 'solid' | 'transparent';
    product_card_style: 'rounded' | 'sharp' | 'pill';
    hero_style: 'full' | 'split' | 'centered';
    font_style: 'modern' | 'classic' | 'playful';
    spacing: 'compact' | 'relaxed' | 'airy';
    animations: 'subtle' | 'dynamic' | 'none';
  };
  colors: {
    background: string;
    card_background: string;
    text_primary: string;
    text_secondary: string;
    border: string;
  };
}

export const storeTemplates: StoreTemplate[] = [
  {
    id: 'minimal-light',
    name: 'Clean Canvas',
    description: 'Clean and simple with lots of white space',
    preview_image: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=300&fit=crop',
    category: 'minimal',
    primary_color: '#008060',
    styles: {
      header_style: 'floating',
      product_card_style: 'rounded',
      hero_style: 'full',
      font_style: 'modern',
      spacing: 'airy',
      animations: 'subtle',
    },
    colors: {
      background: '#ffffff',
      card_background: '#ffffff',
      text_primary: '#1a1a1a',
      text_secondary: '#6b7280',
      border: '#e5e7eb',
    },
  },
  {
    id: 'bold-dark',
    name: 'Midnight Mode',
    description: 'High contrast dark theme with bold typography',
    preview_image: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop',
    category: 'bold',
    primary_color: '#ffffff',
    styles: {
      header_style: 'solid',
      product_card_style: 'sharp',
      hero_style: 'split',
      font_style: 'modern',
      spacing: 'compact',
      animations: 'dynamic',
    },
    colors: {
      background: '#0a0a0a',
      card_background: '#171717',
      text_primary: '#fafafa',
      text_secondary: '#a1a1aa',
      border: '#27272a',
    },
  },
  {
    id: 'elegant-cream',
    name: 'Soft Luxe',
    description: 'Sophisticated warm tones with serif typography',
    preview_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    category: 'elegant',
    primary_color: '#78350f',
    styles: {
      header_style: 'transparent',
      product_card_style: 'rounded',
      hero_style: 'centered',
      font_style: 'classic',
      spacing: 'relaxed',
      animations: 'subtle',
    },
    colors: {
      background: '#faf8f5',
      card_background: '#ffffff',
      text_primary: '#292524',
      text_secondary: '#78716c',
      border: '#e7e5e4',
    },
  },

    {
      id: 'swiggy-delight',
      name: 'Fresh Bites',
      description: 'Vibrant food-focused design with clean typography',
      preview_image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      category: 'playful',
      primary_color: '#FC8019',
      styles: {
        header_style: 'floating',
        product_card_style: 'rounded',
        hero_style: 'full',
        font_style: 'modern',
        spacing: 'relaxed',
        animations: 'dynamic',
      },
      colors: {
        background: '#ffffff',
        card_background: '#ffffff',
        text_primary: '#282C3F',
        text_secondary: '#686B78',
        border: '#E9E9EB',
      },
    },
    {
      id: 'artisan-coffee',
      name: 'Roast & Brew',
      description: 'Premium coffee roaster aesthetic with warm tones',
      preview_image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
      category: 'elegant',
      primary_color: '#4A3728',
      styles: {
        header_style: 'transparent',
        product_card_style: 'rounded',
        hero_style: 'centered',
        font_style: 'classic',
        spacing: 'relaxed',
        animations: 'subtle',
      },
      colors: {
        background: '#FDFBF7',
        card_background: '#FFFFFF',
        text_primary: '#2C1E12',
        text_secondary: '#6F4E37',
        border: '#EBE3D5',
      },
    },
    {
      id: 'modern-mono',
    name: 'Sharp Edge',
    description: 'Sleek monochromatic design with sharp edges',
    preview_image: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=400&h=300&fit=crop',
    category: 'minimal',
    primary_color: '#0f172a',
    styles: {
      header_style: 'solid',
      product_card_style: 'sharp',
      hero_style: 'split',
      font_style: 'modern',
      spacing: 'compact',
      animations: 'none',
    },
    colors: {
      background: '#f8fafc',
      card_background: '#ffffff',
      text_primary: '#0f172a',
      text_secondary: '#64748b',
      border: '#e2e8f0',
    },
  },
    {
      id: 'warm-earth',
      name: 'Terra Natural',
      description: 'Natural earthy tones for organic brands',
      preview_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
      category: 'elegant',
      primary_color: '#92400e',
      styles: {
        header_style: 'transparent',
        product_card_style: 'rounded',
        hero_style: 'full',
        font_style: 'classic',
        spacing: 'airy',
        animations: 'subtle',
      },
      colors: {
        background: '#fefdfb',
        card_background: '#fffbf5',
        text_primary: '#422006',
        text_secondary: '#92400e',
        border: '#fde68a',
      },
    },
  ];

export function getTemplateById(id: string): StoreTemplate | undefined {
  return storeTemplates.find(t => t.id === id);
}

export function getTemplateStyles(template: StoreTemplate) {
  const { styles, colors } = template;
  
  return {
    '--store-bg': colors.background,
    '--store-card-bg': colors.card_background,
    '--store-text': colors.text_primary,
    '--store-text-muted': colors.text_secondary,
    '--store-border': colors.border,
    '--header-style': styles.header_style,
    '--card-radius': styles.product_card_style === 'rounded' ? '16px' : styles.product_card_style === 'pill' ? '9999px' : '4px',
    '--card-radius-sm': styles.product_card_style === 'rounded' ? '12px' : styles.product_card_style === 'pill' ? '9999px' : '2px',
      '--spacing-section': styles.spacing === 'airy' ? '80px' : styles.spacing === 'relaxed' ? '48px' : '32px',
      '--font-heading': styles.font_style === 'classic' ? "'Georgia', serif" : styles.font_style === 'playful' ? "'Comic Neue', cursive" : "'Inter', sans-serif",
      '--font-body': styles.font_style === 'classic' ? "'Georgia', serif" : "'Inter', sans-serif",
    } as React.CSSProperties;
}
