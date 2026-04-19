"use client"

import React, { useEffect, useRef } from 'react';
import { useWindowVirtualizer, useVirtualizer } from '@tanstack/react-virtual';
import { SwiggyProductGrid } from '@/components/SwiggyProductCard';
import type { Category, Product, Merchant } from '@/types/storefront/storefront';
import type { CartItem } from '@/types/storefront/cart';

export type CategoryRow =
  | { type: 'header'; id: string; name: string; count: number }
  | { type: 'products'; id: string; products: Product[] };

export function buildCategoryRows(categories: Category[], categoryProductsMap: Map<string, Product[]>, columns: number) {
  const rows: CategoryRow[] = [];
  const cols = Math.max(columns, 1);
  categories.forEach((cat) => {
    const catProducts = categoryProductsMap.get(cat.id) || [];
    if (catProducts.length === 0) return;
    rows.push({ type: 'header', id: cat.id, name: cat.name, count: catProducts.length });
    for (let i = 0; i < catProducts.length; i += cols) {
      rows.push({ type: 'products', id: cat.id, products: catProducts.slice(i, i + cols) });
    }
  });
  const uncategorized = categoryProductsMap.get('__uncategorized__') || [];
  if (uncategorized.length > 0) {
    const label = categories.length > 0 ? 'Other Products' : 'All Products';
    rows.push({ type: 'header', id: '__uncategorized__', name: label, count: uncategorized.length });
    for (let i = 0; i < uncategorized.length; i += cols) {
      rows.push({ type: 'products', id: '__uncategorized__', products: uncategorized.slice(i, i + cols) });
    }
  }
  return rows;
}

export function VirtualizedCategoryRows({
  rows,
  merchant,
  cartItemById,
  onSelect,
  onAddToCart,
  onUpdateQuantity,
  useWindowScroll,
  scrollRef,
  onEndReached,
  hasMore,
}: {
  rows: CategoryRow[];
  merchant: Merchant;
  cartItemById: Map<string, CartItem>;
  onSelect: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onUpdateQuantity?: (id: string, qty: number, variant?: { id?: string; name?: string } | null) => void;
  useWindowScroll: boolean;
  scrollRef: React.RefObject<HTMLElement | null> | null;
  onEndReached?: () => void;
  hasMore: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = React.useState(0);

  React.useLayoutEffect(() => {
    if (!useWindowScroll) return;
    if (typeof window === 'undefined') return;
    const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next = rect.top + window.scrollY;
      setScrollMargin((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };
    update();
    const handleResize = () => update();
    window.addEventListener('resize', handleResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (observer && document?.body) observer.observe(document.body);
    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [useWindowScroll, rows.length]);

  const windowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 260,
    overscan: 6,
    scrollMargin,
  });

  const elementVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 260,
    overscan: 6,
    getScrollElement: () => scrollRef?.current ?? null,
  });

  const rowVirtualizer = useWindowScroll ? windowVirtualizer : elementVirtualizer;
  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastTriggerRef = useRef<number>(-1);

  useEffect(() => {
    if (!hasMore || !onEndReached || rows.length === 0) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= rows.length - 2 && lastTriggerRef.current !== rows.length) {
      lastTriggerRef.current = rows.length;
      onEndReached();
    }
  }, [virtualItems, rows.length, hasMore, onEndReached]);

  if (rows.length === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
      {virtualItems.map((virtualRow) => {
        const row = rows[virtualRow.index];
        const translateY = useWindowScroll ? virtualRow.start - scrollMargin : virtualRow.start;
        return (
          <div
            key={`${row.type}-${row.id}-${virtualRow.index}`}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${translateY}px)` }}
          >
            {row.type === 'header' ? (
              <div id={`category-${row.id}`} className="mb-2 scroll-mt-28">
                <div className="py-2.5 flex items-baseline justify-between" style={{ background: 'var(--store-bg)' }}>
                  <div>
                    <h3 className="text-[14px] font-bold tracking-tight" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
                      {row.name}
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--store-text-muted)' }}>
                      {row.count} {row.count === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mb-5">
                {row.products.map((product) => (
                  <SwiggyProductGrid
                    key={product.id}
                    product={product}
                    merchant={merchant}
                    onSelect={onSelect}
                    onAddToCart={onAddToCart}
                    quantity={cartItemById.get(product.id)?.quantity || 0}
                    onUpdateQuantity={onUpdateQuantity}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
