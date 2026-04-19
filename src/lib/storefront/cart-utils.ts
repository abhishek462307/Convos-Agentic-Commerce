import type { CartItem, AppliedCoupon } from '@/types';
import type { CartTotals } from '@/types/storefront/cart';

export function calculateSubtotal(cart: CartItem[]): number {
  return cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
}

export function calculateBargainSavings(cart: CartItem[]): number {
  return cart.reduce((acc, i) => {
    if (i.bargainedPrice) return acc + (i.price - i.bargainedPrice) * i.quantity;
    return acc;
  }, 0);
}

export function calculateDiscountableAmount(cart: CartItem[], appliedCoupon: AppliedCoupon | null): number {
  if (!appliedCoupon) return calculateSubtotal(cart);
  
  if (appliedCoupon.excludeBargainedItems) {
    return cart.reduce((acc, i) => i.bargainedPrice ? acc : acc + (i.price * i.quantity), 0);
  }
  
  return cart.reduce((acc, i) => acc + ((i.bargainedPrice || i.price) * i.quantity), 0);
}

export function calculateDiscount(discountableAmount: number, coupon: AppliedCoupon | null): number {
  if (!coupon) return 0;
  if (coupon.discountType === 'percentage') {
    return (discountableAmount * coupon.discountValue) / 100;
  }
  return Math.min(coupon.discountValue, discountableAmount);
}

export function calculateCartTotals(cart: CartItem[], appliedCoupon: AppliedCoupon | null): CartTotals {
  const subtotal = calculateSubtotal(cart);
  const bargainSavings = calculateBargainSavings(cart);
  const discountableAmount = calculateDiscountableAmount(cart, appliedCoupon);
  const discount = calculateDiscount(discountableAmount, appliedCoupon);
  const total = Math.max(0, subtotal - bargainSavings - discount);

  return {
    subtotal,
    bargainSavings,
    discountableAmount,
    discount,
    total
  };
}
