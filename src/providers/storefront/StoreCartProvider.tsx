"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useStoreCoupon } from '@/hooks/storefront/useStoreCoupon';
import { useStorefrontCart } from '@/hooks/storefront/useStorefrontCart';
import type { AppliedCoupon } from '@/types';
import { useStoreDataContext } from './StoreDataProvider';
import { useStoreSessionContext } from './StoreSessionProvider';

type StoreCartContextValue = ReturnType<typeof useStorefrontCart> &
  ReturnType<typeof useStoreCoupon> & {
    appliedCoupon: AppliedCoupon | null;
    setAppliedCoupon: React.Dispatch<React.SetStateAction<AppliedCoupon | null>>;
  };

const StoreCartContext = createContext<StoreCartContextValue | null>(null);

export function StoreCartProvider({ children }: { children: React.ReactNode }) {
  const { subdomain, sessionId, consumerEmail } = useStoreSessionContext();
  const { merchant, allProducts } = useStoreDataContext();
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const applyCouponCodeRef = useRef<(code: string) => Promise<void>>(async () => {});

  const applyCouponCodeProxy = useCallback((code: string) => applyCouponCodeRef.current(code), []);

  const cartState = useStorefrontCart(
    subdomain,
    merchant,
    sessionId,
    consumerEmail,
    allProducts,
    appliedCoupon,
    applyCouponCodeProxy
  );

  const couponState = useStoreCoupon({
    subdomain,
    cart: cartState.cart,
    appliedCoupon,
    setAppliedCoupon,
  });

  useEffect(() => {
    applyCouponCodeRef.current = couponState.applyCouponCode;
  }, [couponState.applyCouponCode]);

  return (
    <StoreCartContext.Provider
      value={{
        ...cartState,
        appliedCoupon,
        setAppliedCoupon,
        ...couponState,
      }}
    >
      {children}
    </StoreCartContext.Provider>
  );
}

export function useStoreCartContext() {
  const context = useContext(StoreCartContext);
  if (!context) {
    throw new Error('useStoreCartContext must be used within StoreCartProvider');
  }
  return context;
}
