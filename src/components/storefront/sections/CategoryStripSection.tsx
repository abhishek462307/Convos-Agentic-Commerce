"use client"

import React from 'react';
import { SwiggyCategories } from '@/components/SwiggyCategories';
import type { SectionSchema } from '@/types/storefront/sections';
import type { Category } from '@/types/storefront/storefront';

interface CategoryStripSectionProps {
    section: SectionSchema;
    categories: Category[];
    selectedCategory: string | null;
    subdomain: string;
    onSelect: (name: string | null) => void;
}

export function CategoryStripSection({
    section,
    categories,
    selectedCategory,
    subdomain,
    onSelect
}: CategoryStripSectionProps) {
    const handleSelect = (name: string | null) => {
        onSelect(name);
        if (!name) {
            const el = document.getElementById('all-products');
            el?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <SwiggyCategories
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelect={handleSelect}
              />
        </div>
    );
}
