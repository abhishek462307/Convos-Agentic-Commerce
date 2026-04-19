"use client"

import React from 'react';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { BackgroundBeams } from '@/components/ui/aceternity';
import { type BundleSection, type Merchant, type Product, type CartItem } from '@/types/storefront';

interface ProductBundleProps {
    section: BundleSection;
    merchant: Merchant;
    onSelectProduct: (product: Product) => void;
    addToCart: (product: Product) => void;
    cart: CartItem[];
}

export function ProductBundle({
    section,
    merchant,
    onSelectProduct,
    addToCart,
    cart
}: ProductBundleProps) {
    const products = section.products || [];
    const totalOriginal = products.reduce((acc: number, p: Product) => acc + Number(p.price), 0);
    const discount = section.discountPercentage || 0;
    const bundlePrice = totalOriginal * (1 - discount / 100);

    const handleAddAll = () => {
        products.forEach((p: Product) => {
            const finalPrice = discount > 0 ? Number(p.price) * (1 - discount / 100) : Number(p.price);
            addToCart({
                ...p,
                bargainedPrice: discount > 0 ? finalPrice : undefined,
                originalPrice: p.price
            });
        });
        toast.success(`Bundle "${section.title}" added to bag!`);
    };

    return (
        <div className="bg-zinc-900 rounded-[40px] p-8 text-white overflow-hidden relative group">
            <BackgroundBeams className="opacity-20" />
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black tracking-tight leading-none mb-1">{section.title}</h3>
                        <p className="text-zinc-400 text-xs font-medium">{section.description}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {products.map((p: Product) => (
                        <div key={p.id} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3">
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                                <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{p.name}</p>
                                <p className="text-xs text-zinc-400">{formatCurrency(p.price, merchant?.currency, merchant?.locale)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-white/10">
                    <div className="text-center sm:text-left">
                        <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
                            <p className="text-3xl font-black text-primary">{formatCurrency(bundlePrice, merchant?.currency, merchant?.locale)}</p>
                            {discount > 0 && (
                                <p className="text-lg text-zinc-500 line-through">{formatCurrency(totalOriginal, merchant?.currency, merchant?.locale)}</p>
                            )}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {discount > 0 ? `Save ${discount}% with this smart bundle` : 'Curated collection for you'}
                        </p>
                    </div>
                    <Button
                        onClick={handleAddAll}
                        className="h-14 px-10 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl bg-primary text-white hover:scale-105 transition-transform"
                    >
                        Add All to Bag
                    </Button>
                </div>
            </div>
        </div>
    );
}
