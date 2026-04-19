import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface Category {
  id: string;
  name: string;
  image_url?: string;
}

interface SwiggyCategoriesProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (categoryName: string | null) => void;
}

export function SwiggyCategories({ categories, selectedCategory, onSelect }: SwiggyCategoriesProps) {
  if (!categories || categories.length === 0) return null;

  const allItems = [{ id: '__all__', name: 'All', image_url: undefined }, ...categories];

  return (
    <div className="mb-14">
      <div className="flex items-center justify-between mb-8 px-1">
        <h2 className="text-[14px] font-black uppercase tracking-wider" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
          Browse By Category
        </h2>
      </div>
      
      <div
        className="flex gap-10 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 snap-x"
      >
        {allItems.map((cat, i) => {
          const isAll = cat.id === '__all__';
          const isActive = isAll ? selectedCategory === null : selectedCategory === cat.name;

          return (
            <button
              key={cat.id}
              onClick={() => {
                if (isAll) {
                  onSelect(null);
                } else {
                  onSelect(selectedCategory === cat.name ? null : cat.name);
                }
              }}
              aria-pressed={isActive}
              className="flex flex-col items-center gap-4 shrink-0 snap-start group"
            >
              <div
                className="relative overflow-hidden transition-all duration-300 rounded-full"
                style={{
                  width: 100,
                  height: 100,
                  border: `2px solid ${isActive ? 'var(--primary)' : 'var(--store-border)'}`,
                  background: isActive
                    ? 'color-mix(in srgb, var(--primary) 5%, white)'
                    : 'white',
                  boxShadow: isActive
                    ? '0 0 0 4px color-mix(in srgb, var(--primary) 10%, transparent)'
                    : 'none',
                }}
              >
                {isAll ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <span
                      className="text-[16px] font-black uppercase tracking-widest"
                      style={{ color: isActive ? 'var(--primary)' : 'black' }}
                    >
                      All
                    </span>
                  </div>
                ) : (
                  <Image
                    src={cat.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                    alt={cat.name}
                    fill
                    sizes="100px"
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                )}
              </div>

              <span
                className="text-[12px] font-black uppercase tracking-tight text-center transition-colors duration-200"
                style={{
                  maxWidth: 100,
                  color: isActive ? 'var(--primary)' : 'black',
                }}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
