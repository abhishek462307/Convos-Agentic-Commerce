"use client"

import React, { useState, use, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link'
import { getStorefrontPath } from '@/lib/storefront/navigation';;
import { Search, ShoppingBag, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SearchSkeleton } from '@/components/StoreSkeletons';
import StorefrontShell from '../StorefrontShell';
import { useStoreData } from '@/providers/storefront';

function SearchContent({ subdomain }: { subdomain: string }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const { merchant, allProducts, loading } = useStoreData();
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allProducts.filter(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [allProducts, query]);

  const currency = merchant?.currency || 'USD';

  if (loading) {
    return <SearchSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:px-6 md:py-20 xl:px-8">
      <div className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <span className="h-[0.5px] w-12" style={{ background: 'var(--store-border)' }} />
          <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">
            Intelligence
          </p>
        </div>

        <h1 className="text-[40px] md:text-[72px] font-black uppercase tracking-tighter leading-[0.9] mb-12">
          Search
        </h1>
        
        <div className="max-w-xl relative group">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH PRODUCTS..."
            className="w-full bg-transparent py-6 text-[20px] md:text-[32px] font-black uppercase tracking-tight placeholder:opacity-100 focus:outline-none transition-colors pr-12"
            style={{ borderBottom: '1px solid var(--store-border)', color: 'var(--store-text)' }}
          />
          <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 group-focus-within:opacity-100 transition-opacity" style={{ color: 'var(--store-text-muted)', opacity: 0.45 }} />
        </div>
      </div>

      <div>
        {query.trim() && (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-12 opacity-30">
            Found {results.length} item{results.length !== 1 ? 's' : ''}
          </p>
        )}

        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Search className="w-24 h-24 mb-12" style={{ color: 'var(--store-border)' }} />
            <p className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--store-text-muted)' }}>Enter a keyword to search the registry.</p>
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-12 relative">
              <ShoppingBag className="w-24 h-24" style={{ color: 'var(--store-border)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <X className="w-6 h-6" style={{ color: 'var(--store-text-muted)' }} />
              </div>
            </div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--store-text-muted)' }}>No matching products discovered.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
            {results.map((product) => (
              <Link
                key={product.id}
                href={getStorefrontPath(subdomain, `/product/${product.id}`, typeof window !== 'undefined' ? window.location.host : undefined)}
                className="group block"
              >
                <div className="aspect-[4/5] relative overflow-hidden mb-6 rounded-[24px]" style={{ background: 'var(--store-card-bg)', border: '1px solid var(--store-border)' }}>
                  <Image
                    src={product.image_url || '/placeholder.svg'}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <div className="absolute top-3 right-3 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full" style={{ background: 'var(--store-text)', color: 'var(--store-bg)' }}>
                      -{Math.round((1 - product.price / product.compare_at_price) * 100)}%
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-[13px] font-black uppercase tracking-tight leading-tight group-hover:underline underline-offset-4">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-3">
                    <span className="text-[14px] font-black">
                      {formatCurrency(product.price, currency)}
                    </span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="text-[11px] line-through font-bold" style={{ color: 'var(--store-text-muted)' }}>
                        {formatCurrency(product.compare_at_price, currency)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = use(params);

  return (
    <StorefrontShell subdomain={subdomain}>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchContent subdomain={subdomain} />
      </Suspense>
    </StorefrontShell>
  );
}
