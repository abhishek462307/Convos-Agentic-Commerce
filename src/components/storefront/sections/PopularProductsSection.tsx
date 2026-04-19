"use client"

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SwiggyProductGrid } from '@/components/SwiggyProductCard';
import { SectionHeader } from '@/components/storefront/shared/SectionHeader';
import type { SectionSchema } from '@/types/storefront/sections';
import type { Product, Merchant } from '@/types/storefront/storefront';
import type { CartItem } from '@/types/storefront/cart';

interface PopularProductsSectionProps {
    section: SectionSchema;
    filteredProducts: Product[];
    merchant: Merchant;
    cart: CartItem[];
    onSelectProduct: (product: Product) => void;
    addToCart: (product: Product) => void;
    onUpdateQuantity?: (id: string, qty: number) => void;
    onSeeAll: () => void;
}

export function PopularProductsSection({
    section,
    filteredProducts,
    merchant,
    cart,
    onSelectProduct,
    addToCart,
    onUpdateQuantity,
    onSeeAll
}: PopularProductsSectionProps) {
    const popularProducts = filteredProducts.length > 0
        ? filteredProducts.filter((p) => p.badge === 'Popular' || p.badge === 'Best Seller')
        : [];

    const allPopular = popularProducts.length === 0
        ? filteredProducts
            .slice()
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        : popularProducts;

    const fallbackPopular = allPopular.slice(0, 8);
    const hasMore = allPopular.length > 8;

    if (fallbackPopular.length === 0) return null;

    return (
        <div className="mb-6 mt-2">
            <div className="flex items-center justify-between mb-3">
                <SectionHeader title={section.title || 'Popular Right Now'} sectionId={section.id} showSparkles={false} className="mb-0 flex-1" />
                {hasMore && (
                    <Button
                        variant="link"
                        className="font-medium text-[11px] h-auto p-0 gap-1"
                        style={{ color: 'var(--primary)' }}
                        onClick={onSeeAll}
                    >
                        See all <ArrowRight className="w-3 h-3" />
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {fallbackPopular.map((product) => (
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
}
