"use client"

import React from 'react';
import { SwiggyProductGrid } from '@/components/SwiggyProductCard';
import { SectionHeader } from '@/components/storefront/shared/SectionHeader';
import type {
  AllProductsSection,
  Category,
  Product,
  Merchant,
} from '@/types/storefront/storefront';
import type { CartItem } from '@/types/storefront/cart';

interface AllProductsSectionProps {
    section: AllProductsSection;
    categories: Category[];
    allProducts: Product[];
    merchant: Merchant;
    onSelectProduct: (product: Product) => void;
    addToCart: (product: Product) => void;
    cart: CartItem[];
    onUpdateQuantity?: (id: string, qty: number) => void;
}

export function AllProductsSection({
    section,
    categories,
    allProducts,
    merchant,
    onSelectProduct,
    addToCart,
    cart,
    onUpdateQuantity
}: AllProductsSectionProps) {
    return (
        <div id="all-products" className="pt-2">
            {section.title && (
                <SectionHeader title={section.title} sectionId={section.id} showSparkles={false} />
            )}
            {categories.map((cat: Category) => {
                const catProducts = allProducts.filter((p: Product) => p.category_id === cat.id || p.category === cat.name);
                if (catProducts.length === 0) return null;

                return (
                    <div key={cat.id} id={`category-${cat.id}`} className="mb-8 scroll-mt-20">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
                            <div>
                                <h3 className="text-[14px] font-bold tracking-tight" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
                                    {cat.name}
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: 'var(--store-text-muted)' }}>
                                    {catProducts.length} curated items
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                            {catProducts.map((product: Product) => (
                                <SwiggyProductGrid
                                    key={product.id}
                                    product={product}
                                    merchant={merchant}
                                    onSelect={onSelectProduct}
                                    onAddToCart={addToCart}
                                    cart={cart}
                                    onUpdateQuantity={onUpdateQuantity}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
