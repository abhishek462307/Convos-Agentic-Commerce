"use client"

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { AppliedCoupon, CartItem } from '@/types';

type UseStoreCouponProps = {
  subdomain: string;
  cart: CartItem[];
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: React.Dispatch<React.SetStateAction<AppliedCoupon | null>>;
};

export function useStoreCoupon({
  subdomain,
  cart,
  appliedCoupon,
  setAppliedCoupon,
}: UseStoreCouponProps) {
  const [couponInput, setCouponInput] = useState('');

  useEffect(() => {
    const savedCoupon = localStorage.getItem(`coupon_${subdomain}`);
    if (!savedCoupon) {
      return;
    }

    try {
      setAppliedCoupon(JSON.parse(savedCoupon));
    } catch {}
  }, [setAppliedCoupon, subdomain]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem(`coupon_${subdomain}`, JSON.stringify(appliedCoupon));
      return;
    }

    localStorage.removeItem(`coupon_${subdomain}`);
  }, [appliedCoupon, subdomain]);

  useEffect(() => {
    if (!appliedCoupon?.excludeBargainedItems) {
      return;
    }

    const hasEligibleItems = cart.some((item) => !item.bargainedPrice);
    if (hasEligibleItems) {
      return;
    }

    setAppliedCoupon(null);
    toast.error('Discount codes cannot be applied to bargained items.');
  }, [appliedCoupon, cart, setAppliedCoupon]);

  const applyCouponCode = useCallback(async (code: string) => {
    const subtotal = cart.reduce((acc, item) => acc + ((item.bargainedPrice || item.price) * item.quantity), 0);
    const eligibleAmount = cart.reduce((acc, item) => {
      if (!item.bargainedPrice) {
        return acc + (item.price * item.quantity);
      }
      return acc;
    }, 0);

    try {
      const response = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subdomain, orderAmount: subtotal, eligibleAmount }),
      });
      const data = await response.json();

      if (data.success) {
        setAppliedCoupon({
          code: data.discount.code,
          discountType: data.discount.type,
          discountValue: data.discount.value,
          excludeBargainedItems: data.excludeBargainedItems,
        });
        toast.success(`Discount ${data.discount.code} applied!`);
        return;
      }

      toast.error(data.error || 'Invalid discount code');
    } catch {
      toast.error('Failed to apply discount');
    }
  }, [cart, setAppliedCoupon, subdomain]);

  const handleApplyCoupon = useCallback(() => {
    const code = couponInput.trim();
    if (!code) {
      return;
    }

    applyCouponCode(code).then(() => setCouponInput(''));
  }, [applyCouponCode, couponInput]);

  return {
    couponInput,
    setCouponInput,
    applyCouponCode,
    handleApplyCoupon,
  };
}
