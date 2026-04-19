"use client"
// Force update

import React from 'react';
import { motion } from 'framer-motion';
import { ProductBundle } from '../shared/ProductBundle';
import { type BundleSection, type Merchant, type Product, type CartItem } from '@/types/storefront';

interface ProductBundleSectionProps {
    section: BundleSection;
    merchant: Merchant;
    onSelectProduct: (product: Product) => void;
    addToCart: (product: Product) => void;
    cart: CartItem[];
}

export function ProductBundleSection({
    section,
    merchant,
    onSelectProduct,
    addToCart,
    cart
}: ProductBundleSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full"
        >
            <ProductBundle
                section={section}
                merchant={merchant}
                onSelectProduct={onSelectProduct}
                addToCart={addToCart}
                cart={cart}
            />
        </motion.div>
    );
}
