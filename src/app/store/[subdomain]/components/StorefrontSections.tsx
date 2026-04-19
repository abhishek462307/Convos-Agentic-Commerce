"use client"

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { AIStorefront } from '@/components/StoreAIStorefront';
import { getStorefrontPath } from '@/lib/storefront/navigation';
import { renderSection, SectionRenderContext } from '@/lib/storefront/sections';
import { useStoreData, useStoreCart, useStoreChat } from '@/providers/storefront';
import type { SectionSchema } from '@/types/storefront/sections';
import type { Merchant as StorefrontMerchantView, Product as StorefrontProduct } from '@/types/storefront/storefront';
import type { Product } from '@/types';

// Type guard to check if object is a valid StorefrontProduct
function isStorefrontProduct(obj: unknown): obj is StorefrontProduct {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return typeof p.id === 'string' && typeof p.name === 'string' && typeof p.price === 'number';
}

// Map StorefrontProduct to full Product type with required defaults
function mapStorefrontToProduct(storefront: StorefrontProduct, merchantId?: string): Product {
  return {
    // Start with storefront data first
    ...storefront,
    // Then ensure required fields are present
    id: storefront.id,
    merchant_id: merchantId || (storefront as unknown as Record<string, string>).merchant_id || '',
    name: storefront.name,
    price: storefront.price,
    description: storefront.description,
    compare_at_price: storefront.originalPrice ?? (storefront as unknown as Record<string, number | null>).compare_at_price ?? null,
    stock_quantity: (storefront as unknown as Record<string, number>).stock_quantity ?? 0,
    category: storefront.category,
    category_id: storefront.category_id,
    image_url: storefront.image_url,
    images: storefront.image_url ? [storefront.image_url] : [],
    is_active: true,
    sku: null,
    weight: null,
    created_at: storefront.created_at,
    updated_at: storefront.created_at,
    badge: storefront.badge,
    bargain_enabled: false,
    bargain_min_price: storefront.bargainedPrice ?? null,
    track_quantity: false,
    type: null,
    variants: [],
    rating: null,
    review_count: 0,
    review_summary: null,
    popularity_reason: null,
    is_veg: false,
    original_price: storefront.originalPrice
  };
}

export function StorefrontSections({ 
  subdomain,
  filter
}: { 
  subdomain: string;
  filter?: (section: SectionSchema) => boolean;
}) {
  const router = useRouter();
  const {
    merchant, template, categories, selectedCategory, setSelectedCategory,
    filteredProducts, trustCues, allProducts, discounts, sections: sectionSchemas
  } = useStoreData();

  const { 
    cart, cartItemById, addToCart, updateQuantity, applyCouponCode 
  } = useStoreCart();

  const { aiLayout } = useStoreChat();

  const filteredSections = useMemo(() => {
    if (filter) return sectionSchemas.filter(filter);
    return sectionSchemas;
  }, [sectionSchemas, filter]);

  if (!merchant) {
    return null;
  }

  const storefrontMerchant = useMemo(
    () => ({
      ...merchant,
      name: merchant.store_name ?? (merchant as { name?: string }).name ?? '',
      branding_settings: merchant.branding_settings as StorefrontMerchantView['branding_settings'],
    }) as StorefrontMerchantView,
    [merchant]
  );

  const storefrontCategories = useMemo(
    () => categories.map((category) => ({ ...category, image_url: category.image_url ?? undefined })),
    [categories]
  );

  const handleSelectProduct = useCallback((p: StorefrontProduct) => {
    router.push(getStorefrontPath(subdomain, `/product/${p.id}`, window.location.host));
  }, [router, subdomain]);

  const handleCategorySelect = useCallback((name: string | null) => {
    if (!name) router.push(getStorefrontPath(subdomain, '/products', window.location.host));
    else {
      const cat = categories.find(c => c.name === name);
      if (cat) router.push(getStorefrontPath(subdomain, `/category/${cat.id}`, window.location.host));
    }
  }, [categories, router, subdomain]);

  const handleSeeAll = useCallback(() => {
    router.push(getStorefrontPath(subdomain, '/products', window.location.host));
  }, [router, subdomain]);

  const handleAddToCart = useCallback((product: StorefrontProduct) => {
    const mappedProduct = mapStorefrontToProduct(product, merchant?.id);
    addToCart(mappedProduct);
  }, [addToCart, merchant?.id]);

  const normalizeProduct = useCallback((product: Partial<StorefrontProduct> | unknown): StorefrontProduct | null => {
    if (!isStorefrontProduct(product)) return null;
    return {
      ...product,
      image_url: product.image_url ?? '',
    };
  }, []);

  const storefrontAllProducts = useMemo(
    () => allProducts.map(normalizeProduct).filter((p): p is StorefrontProduct => p !== null),
    [allProducts, normalizeProduct]
  );

  const storefrontFilteredProducts = useMemo(
    () => filteredProducts.map(normalizeProduct).filter((p): p is StorefrontProduct => p !== null),
    [filteredProducts, normalizeProduct]
  );

  const sectionContext = useMemo<SectionRenderContext>(() => ({
    template,
    subdomain,
    merchant: storefrontMerchant,
    categories,
    storefrontCategories,
    filteredProducts: storefrontFilteredProducts,
    allProducts: storefrontAllProducts,
    discounts,
    trustCues,
    selectedCategory,
    handleCategorySelect,
    handleSelectProduct,
    handleSeeAll,
    addToCart: handleAddToCart,
    updateQuantity,
    applyCouponCode,
    cart,
    cartItemById,
  }), [
    template,
    subdomain,
    storefrontMerchant,
    categories,
    storefrontCategories,
    storefrontFilteredProducts,
    storefrontAllProducts,
    discounts,
    trustCues,
    selectedCategory,
    handleCategorySelect,
    handleSelectProduct,
    handleSeeAll,
    handleAddToCart,
    updateQuantity,
    applyCouponCode,
    cart,
    cartItemById,
  ]);

  const content = useMemo(() => {
    if (aiLayout) {
      return (
        <div key="ai-constructed">
          <AIStorefront
            layout={aiLayout}
            merchant={storefrontMerchant}
            onSelectProduct={handleSelectProduct}
            addToCart={addToCart}
            cart={cart}
            categories={categories}
            allProducts={allProducts}
            discounts={discounts}
            onApplyCoupon={applyCouponCode}
            setSelectedCategory={setSelectedCategory}
            onUpdateQuantity={updateQuantity}
            subdomain={subdomain}
          />
        </div>
      );
    }
    return (
      <div key="store-default" className="space-y-6">
        {filteredSections.map((section: SectionSchema) => (
          <React.Fragment key={section.id}>
            {renderSection(sectionContext, section)}
          </React.Fragment>
        ))}
      </div>
    );
  }, [
    aiLayout,
    filteredSections,
    sectionContext,
    storefrontMerchant,
    cart,
    categories,
    allProducts,
    discounts,
    handleSelectProduct,
    handleAddToCart,
    applyCouponCode,
    setSelectedCategory,
    updateQuantity,
    subdomain,
  ]);

  return content;
}
