"use client"

import { useMemo, useState, useCallback, useEffect } from 'react';
import { buildCategoryRows } from '@/app/store/[subdomain]/components/VirtualizedCategoryRows';
import { INITIAL_ROWS, ROW_BATCH, ICON_MAP } from '@/lib/storefront';
import { Truck } from 'lucide-react';
import React from 'react';

export function useStorefrontProducts(
  allProducts: any[],
  categories: any[],
  columns: number,
  searchQuery: string,
  selectedCategory: string | null,
  branding: any
) {
  const [visibleRowCount, setVisibleRowCount] = useState(INITIAL_ROWS);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [allProducts, searchQuery]);

  const categoryProductsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    if (filteredProducts.length === 0) return map;
    const categoryIdSet = new Set(categories.map(cat => cat.id));
    const nameToId = new Map(categories.map(cat => [(cat.name || '').toLowerCase(), cat.id]));
    const seenByCategory = new Map<string, Set<string>>();
    const push = (categoryId: string, product: any) => {
      let seen = seenByCategory.get(categoryId);
      if (!seen) {
        seen = new Set();
        seenByCategory.set(categoryId, seen);
      }
      if (seen.has(product.id)) return;
      seen.add(product.id);
      const list = map.get(categoryId);
      if (list) list.push(product);
      else map.set(categoryId, [product]);
    };
    for (const product of filteredProducts) {
      const ids = new Set<string>();
      if (product?.category_id && categoryIdSet.has(product.category_id)) {
        ids.add(product.category_id);
      }
      const nameKey = (product?.category || '').toLowerCase();
      if (nameKey) {
        const nameId = nameToId.get(nameKey);
        if (nameId) ids.add(nameId);
      }
      if (ids.size === 0) {
        push('__uncategorized__', product);
      } else {
        ids.forEach((id) => push(id, product));
      }
    }
    return map;
  }, [categories, filteredProducts]);

  const allCategoryRows = useMemo(() => {
    const rows = buildCategoryRows(categories, categoryProductsMap, columns);
    if (!selectedCategory) return rows;
    const result: typeof rows = [];
    let inSelected = false;
    for (const row of rows) {
      if (row.type === 'header') {
        inSelected = row.name === selectedCategory;
        if (inSelected) result.push(row);
      } else if (inSelected) {
        result.push(row);
      }
    }
    return result;
  }, [categories, categoryProductsMap, columns, selectedCategory]);

  useEffect(() => {
    setVisibleRowCount(Math.min(INITIAL_ROWS, allCategoryRows.length));
  }, [columns, searchQuery, selectedCategory, allCategoryRows.length]);

  const visibleCategoryRows = useMemo(
    () => allCategoryRows.slice(0, visibleRowCount),
    [allCategoryRows, visibleRowCount]
  );

  const canLoadMoreRows = visibleRowCount < allCategoryRows.length;
  const handleLoadMoreRows = useCallback(() => {
    if (!canLoadMoreRows) return;
    setVisibleRowCount(prev => Math.min(prev + ROW_BATCH, allCategoryRows.length));
  }, [canLoadMoreRows, allCategoryRows.length]);

  const trustCues = useMemo(() => {
    const badges = branding.sections?.find((s: any) => s.type === 'trust_cues')?.content?.badges;
    if (badges && Array.isArray(badges) && badges.length > 0) {
      return badges.map((b: any) => ({
        icon: ICON_MAP[b.icon] || React.createElement(Truck, { className: "w-5 h-5" }),
        label: b.label,
        desc: b.desc
      }));
    }

    return [
      { icon: React.createElement(Truck, { className: "w-5 h-5" }), label: 'Fast Delivery', desc: 'Quick & reliable shipping' },
      { icon: React.createElement(Truck, { className: "w-5 h-5" }), label: 'Secure Checkout', desc: 'Your data is protected' },
      { icon: React.createElement(Truck, { className: "w-5 h-5" }), label: 'Easy Returns', desc: 'Hassle-free return policy' },
      { icon: React.createElement(Truck, { className: "w-5 h-5" }), label: 'Trusted Store', desc: `${allProducts.length}+ products available` },
    ];
  }, [allProducts.length, branding]);

  return {
    filteredProducts,
    categoryProductsMap,
    allCategoryRows,
    visibleCategoryRows,
    canLoadMoreRows,
    handleLoadMoreRows,
    trustCues
  };
}
