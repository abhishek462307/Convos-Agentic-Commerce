"use client"

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useStoreData, useStoreCart } from '@/providers/storefront';
import { SwiggyProductGrid } from '@/components/SwiggyProductCard';

type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'rating';

export function StorefrontProductGrid({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const { merchant, allProducts, categories } = useStoreData();
  const { cart, addToCart: providerAddToCart, updateQuantity } = useStoreCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  const category = categoryId ? categories.find(c => c.id === categoryId) : null;
  const pageTitle = category?.name || 'All Products';
  const emptyText = category ? 'No products in this category yet.' : 'No products in this store yet.';

  const filteredProducts = useMemo(() => {
    let next = allProducts;
    if (categoryId) {
      next = next.filter(p => p.category_id === categoryId || p.category === category?.name);
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);

    next = next.filter((product) => {
      const name = product.name?.toLowerCase() || '';
      const description = product.description?.toLowerCase() || '';
      const price = Number(product.price || 0);
      const matchesSearch = !normalizedSearch || name.includes(normalizedSearch) || description.includes(normalizedSearch);
      const matchesMin = min === null || Number.isNaN(min) || price >= min;
      const matchesMax = max === null || Number.isNaN(max) || price <= max;
      const matchesStock = !inStockOnly || product.stock_quantity === null || product.stock_quantity > 0;
      return matchesSearch && matchesMin && matchesMax && matchesStock;
    });

    const sorted = [...next];
    return sorted.sort((a, b) => {
      const priceA = Number(a.price || 0);
      const priceB = Number(b.price || 0);
      const ratingA = Number(a.rating || 0);
      const ratingB = Number(b.rating || 0);
      const reviewsA = Number(a.review_count || 0);
      const reviewsB = Number(b.review_count || 0);
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;

      switch (sortBy) {
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'newest':
          return createdB - createdA;
        case 'rating':
          return ratingB - ratingA || reviewsB - reviewsA;
        default:
          return reviewsB - reviewsA || ratingB - ratingA || createdB - createdA;
      }
    });
  }, [allProducts, categoryId, category?.name, searchQuery, minPrice, maxPrice, inStockOnly, sortBy]);

  const handleSelectProduct = (product: any) => {
    router.push(`/store/${merchant?.subdomain}/product/${product.id}`);
  };

  const handleAddToCart = (product: any) => {
    providerAddToCart(product);
    toast.success('Added to cart');
  };

  const handleUpdateQuantity = (id: string, qty: number, variant?: any) => {
    updateQuantity(id, qty, variant);
  };

  return (
    <div className="w-full px-4 py-10 md:px-6 xl:px-8 max-w-[1400px] mx-auto min-h-[50vh]">
      <div className="mb-14 text-center border-b pb-12" style={{ borderColor: 'var(--store-border)' }}>
        <h1 className="text-[32px] md:text-[52px] font-black uppercase tracking-tight mb-4" style={{ color: 'var(--store-text)' }}>
          {pageTitle}
        </h1>
        <p className="text-[12px] font-black uppercase tracking-[0.3em] opacity-30">
          Discover {filteredProducts.length} {filteredProducts.length === 1 ? 'Selection' : 'Selections'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <div className="relative w-full max-w-md pb-2" style={{ borderBottom: '1px solid var(--store-border)' }}>
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: 'var(--store-text)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${pageTitle}...`}
            className="w-full bg-transparent pl-8 pr-4 py-1 text-[13px] font-medium outline-none"
            style={{ color: 'var(--store-text)' }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:opacity-60 transition-opacity pb-2 px-2"
            style={{ borderBottom: '0.5px solid var(--store-border)', color: 'var(--store-text)' }}
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low-High</option>
            <option value="price_desc">Price: High-Low</option>
            <option value="rating">Top Rated</option>
          </select>

          <div className="flex items-center gap-4 pb-2 px-2" style={{ borderBottom: '0.5px solid var(--store-border)' }}>
            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--store-text-muted)' }}>Price</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="MIN"
              className="w-12 bg-transparent text-[11px] font-black outline-none placeholder:opacity-100" style={{ color: 'var(--store-text)' }}
            />
            <span style={{ color: 'var(--store-text-muted)', opacity: 0.5 }}>—</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="MAX"
              className="w-12 bg-transparent text-[11px] font-black outline-none placeholder:opacity-100" style={{ color: 'var(--store-text)' }}
            />
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-[12px] font-black uppercase tracking-widest" style={{ color: 'var(--store-text-muted)' }}>
            {searchQuery ? 'No results found for your search' : emptyText.toUpperCase()}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-8 gap-x-4">
          {filteredProducts.map((product) => (
            <SwiggyProductGrid
              key={product.id}
              product={product}
              merchant={merchant || {}}
              onSelect={handleSelectProduct}
              onAddToCart={handleAddToCart}
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              subdomain={merchant?.subdomain}
            />
          ))}
        </div>
      )}
    </div>
  );
}
