"use client"

import React from 'react';
import { Package } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import { SwiggyProductGrid } from '@/components/SwiggyProductCard';
import type { ProductGridSection, Merchant, Product, Category } from '@/types/storefront/storefront';
import type { CartItem } from '@/types/storefront/cart';

interface ProductGridSectionProps {
    section: ProductGridSection;
    merchant: Merchant;
    allProducts: Product[];
    categories: Category[];
    onSelectProduct: (product: Product) => void;
    addToCart: (product: Product) => void;
    cart: CartItem[];
    onUpdateQuantity?: (id: string, qty: number) => void;
}

export function ProductGridSectionComponent({
    section,
    merchant,
    allProducts,
    categories,
    onSelectProduct,
    addToCart,
    cart,
    onUpdateQuantity
}: ProductGridSectionProps) {
    let products = section.products || [];

    if (products.length === 0) {
        if (section.productIds) {
            products = allProducts.filter((p: Product) => section.productIds!.includes(p.id));
        } else if (section.category || section.categoryId) {
    const targetCat = section.category || categories.find((c) => c.id === section.categoryId)?.name;
            products = allProducts.filter((p: Product) => p.category === targetCat || p.category_id === section.categoryId);
        }
    }

    if (products.length === 0 && allProducts.length > 0) {
        products = allProducts.slice(0, 8);
    }

    if (products.length === 0) {
        return (
            <div className="py-12 text-center border-2 border-dashed rounded-[32px]" style={{ borderColor: 'var(--store-border)' }}>
                <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--store-text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--store-text)' }}>No products found matching this section.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
            {section.title && (
                <SectionHeader
                    title={section.title}
                    sectionId={section.id}
                    showSparkles={true}
                />
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {products.map((p: Product) => (
                    <SwiggyProductGrid
                        key={p.id}
                        product={p}
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
