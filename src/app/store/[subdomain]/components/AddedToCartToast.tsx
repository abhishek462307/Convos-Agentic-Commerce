"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { CartItem } from '@/types/storefront/cart';
import { getStorefrontPath } from '@/lib/storefront/navigation';

interface AddedToCartToastProps {
  showAddedToCart: boolean;
  lastAddedItems: CartItem[];
  setShowAddedToCart: (show: boolean) => void;
  subdomain: string;
}

export const AddedToCartToast = React.memo(function AddedToCartToast({
  showAddedToCart,
  lastAddedItems,
  setShowAddedToCart,
  subdomain,
}: AddedToCartToastProps) {
  const router = useRouter();
  return (
    <AnimatePresence>
      {showAddedToCart && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10, transition: { duration: 0.15 } }}
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div
            className="flex items-center gap-3 pl-4 pr-2 py-2 shadow-xl border backdrop-blur-xl"
            style={{
              background: 'color-mix(in srgb, var(--store-card-bg) 90%, transparent)',
              borderColor: 'var(--store-border)',
              borderRadius: 'var(--card-radius)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
            <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: 'var(--store-text)' }}>
              {lastAddedItems.length === 1 ? lastAddedItems[0]?.name : `${lastAddedItems.length} items added`}
            </span>
            <Button
              className="h-8 px-3 text-[11px] font-black shrink-0 text-white"
              style={{
                borderRadius: 'var(--card-radius-sm)',
                backgroundColor: 'var(--primary)',
              }}
              onClick={() => {
                setShowAddedToCart(false);
                router.push(getStorefrontPath(subdomain, '/cart', window.location.host));
              }}
            >
              View Bag
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
