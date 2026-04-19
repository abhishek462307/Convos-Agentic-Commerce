import React from 'react';
import type { SectionSchema, SectionType } from '@/types/storefront/sections';
import type { StoreTemplate } from '@/lib/store-templates';
import type { Discount } from '@/types';
import type { CartItem, VariantRef } from '@/types/storefront/cart';
import type { Banner, Category, Product, TrustCue, HeroSection, Merchant as StorefrontMerchantView } from '@/types/storefront/storefront';
import { NewsletterSection } from '@/app/store/[subdomain]/components/NewsletterSection';
import {
  AllProductsSection,
  CategoryStripSection,
  ProductBundleSection,
  ProductGridSectionComponent,
  HeroSectionComponent,
  PromoCodesSection,
  PopularProductsSection,
  BestSellersSection,
  TrustCuesSection,
  WelcomeTextSection,
} from '@/components/storefront';

export const DEFAULT_SECTION_LIST: SectionSchema[] = [
  { id: 'hero-1', type: 'hero', enabled: true, content: { banners: [] } },
  { id: 'promo-1', type: 'promo_codes', enabled: true },
  { id: 'trust-1', type: 'trust_cues', enabled: true },
  { id: 'cats-1', type: 'categories', title: 'Browse by Category', enabled: true },
  { id: 'popular-1', type: 'popular_products', title: 'Popular Right Now', enabled: true },
  { id: 'best-1', type: 'best_sellers', title: 'Best Sellers', enabled: true },
  { id: 'all-1', type: 'all_products', title: 'All Products', enabled: true },
  { id: 'welcome-1', type: 'welcome_text', enabled: true },
  { id: 'news-1', type: 'newsletter', enabled: true },
];

export const SECTION_TYPES: SectionType[] = [
  'hero',
  'product_bundle',
  'product_grid',
  'promo_codes',
  'trust_cues',
  'category_strip',
  'categories',
  'popular_products',
  'best_sellers',
  'all_products',
  'welcome_text',
  'newsletter',
];

export function isSectionType(value?: string | null): value is SectionType {
  return typeof value === 'string' && SECTION_TYPES.includes(value as SectionType);
}

export function normalizeSections(sections: SectionSchema[] | undefined): SectionSchema[] {
  if (!sections || sections.length === 0) {
    return DEFAULT_SECTION_LIST;
  }

  return sections
    .filter((section) => Boolean(section.id && section.type))
    .map((section) => ({
      enabled: true,
      ...section,
    }));
}

export function validateSections(sections: SectionSchema[]): SectionSchema[] {
  return sections.filter((section) => isSectionType(section.type));
}

export function mergeWithDefaults(sections: SectionSchema[]): SectionSchema[] {
  if (sections === DEFAULT_SECTION_LIST) {
    return sections;
  }

  const defaultMap = new Map<string, SectionSchema>();
  for (const section of DEFAULT_SECTION_LIST) {
    defaultMap.set(section.id, section);
  }

  return sections.map(section => {
    if (section.id && defaultMap.has(section.id)) {
      return { ...defaultMap.get(section.id), ...section };
    }
    return section;
  }).filter((section) => section.enabled !== false);
}

export interface SectionRenderContext {
  template?: StoreTemplate;
  subdomain: string;
  merchant: StorefrontMerchantView;
  categories: Category[];
  storefrontCategories: Category[];
  filteredProducts: Product[];
  allProducts: Product[];
  discounts: Discount[];
  trustCues: TrustCue[];
  selectedCategory: string | null;
  handleCategorySelect: (value: string | null) => void;
  handleSelectProduct: (product: Product) => void;
  handleSeeAll: () => void;
  addToCart: (product: Product) => void;
  updateQuantity: (id: string, qty: number, variant?: VariantRef | null) => void;
  applyCouponCode: (code: string) => void;
  cart: CartItem[];
  cartItemById: Map<string, CartItem>;
}

type SectionRenderer = (context: SectionRenderContext, section: SectionSchema) => React.ReactNode;

const SECTION_RENDERERS: Record<SectionType, SectionRenderer> = {
  hero: (context, section) => {
    const heroSection: HeroSection = {
      id: section.id,
      type: 'hero',
      banners: Array.isArray(section.content?.banners) ? (section.content.banners as Banner[]) : [],
      banner_url: typeof section.content?.banner_url === 'string' ? section.content.banner_url : undefined,
      title: section.title,
      subtitle: typeof section.content?.subtitle === 'string' ? section.content.subtitle : undefined,
    };
    return (
      <div className="w-full">
        <HeroSectionComponent
          section={heroSection}
          merchant={context.merchant}
        />
      </div>
    );
  },
  product_bundle: (context, section) => {
    const bundleSection = {
      id: section.id,
      type: 'product_bundle' as const,
      title: section.title || 'Bundle',
      description: typeof section.content?.description === 'string' ? section.content.description : '',
      products: Array.isArray(section.content?.products) ? (section.content.products as Product[]) : [],
      discountPercentage: typeof section.content?.discountPercentage === 'number'
        ? section.content.discountPercentage
        : undefined,
    };

    return (
      <div className="w-full">
        <ProductBundleSection
          section={bundleSection}
          merchant={context.merchant}
          onSelectProduct={context.handleSelectProduct}
          addToCart={context.addToCart}
          cart={context.cart}
        />
      </div>
    );
  },
  product_grid: (context, section) => {
    const gridSection = {
      id: section.id,
      type: 'product_grid' as const,
      title: section.title,
      products: Array.isArray(section.content?.products) ? (section.content.products as Product[]) : undefined,
      productIds: Array.isArray(section.content?.productIds) ? (section.content.productIds as string[]) : undefined,
      category: typeof section.content?.category === 'string' ? section.content.category : undefined,
      categoryId: typeof section.content?.categoryId === 'string' ? section.content.categoryId : undefined,
    };

    return (
      <div className="w-full">
        <ProductGridSectionComponent
          section={gridSection}
          merchant={context.merchant}
          allProducts={context.allProducts}
          categories={context.categories}
          onSelectProduct={context.handleSelectProduct}
          addToCart={context.addToCart}
          cart={context.cart}
          onUpdateQuantity={context.updateQuantity}
        />
      </div>
    );
  },
  promo_codes: (context) => (
    <div className="mt-6">
      <PromoCodesSection discounts={context.discounts} onApply={context.applyCouponCode} />
    </div>
  ),
  trust_cues: (context) => (
    <TrustCuesSection trustCues={context.trustCues} />
  ),
  category_strip: (context, section) => (
    <CategoryStripSection
      section={section}
      categories={context.storefrontCategories}
      selectedCategory={context.selectedCategory}
      subdomain={context.subdomain}
      onSelect={context.handleCategorySelect}
    />
  ),
  categories: (context, section) => (
    <CategoryStripSection
      section={section}
      categories={context.storefrontCategories}
      selectedCategory={context.selectedCategory}
      subdomain={context.subdomain}
      onSelect={context.handleCategorySelect}
    />
  ),
  popular_products: (context, section) => (
    <PopularProductsSection
      section={section}
      filteredProducts={context.filteredProducts}
      merchant={context.merchant}
      cart={context.cart}
      onSelectProduct={context.handleSelectProduct}
      addToCart={context.addToCart}
      onUpdateQuantity={context.updateQuantity}
      onSeeAll={context.handleSeeAll}
    />
  ),
  best_sellers: (context, section) => (
    <BestSellersSection
      section={section}
      filteredProducts={context.filteredProducts}
      merchant={context.merchant}
      cart={context.cart}
      onSelectProduct={context.handleSelectProduct}
      addToCart={context.addToCart}
      onUpdateQuantity={context.updateQuantity}
      onSeeAll={context.handleSeeAll}
    />
  ),
  all_products: (context, section) => (
    <AllProductsSection
      section={{
        id: section.id,
        type: 'all_products',
        title: section.title,
      }}
      categories={context.categories}
      allProducts={context.allProducts}
      merchant={context.merchant}
      onSelectProduct={context.handleSelectProduct}
      addToCart={context.addToCart}
      cart={context.cart}
      onUpdateQuantity={context.updateQuantity}
    />
  ),
  welcome_text: (context, section) => (
    <WelcomeTextSection section={section} />
  ),
  newsletter: (context, section) => (
    <NewsletterSection section={section} subdomain={context.subdomain} />
  ),
};

export function renderSection(context: SectionRenderContext, section: SectionSchema): React.ReactNode {
  if (!section.enabled) {
    return null;
  }
  const renderer = SECTION_RENDERERS[section.type];
  return renderer ? renderer(context, section) : null;
}
