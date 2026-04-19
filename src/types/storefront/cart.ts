import type { CartItem as BaseCartItem, Product } from '@/types';

export type CartItem = BaseCartItem;

export interface CartTotals {
  subtotal: number;
  bargainSavings: number;
  discountableAmount: number;
  discount: number;
  total: number;
}

export type CartAction = 
  | { type: 'add'; product: Product; quantity?: number; variant?: VariantRef | null }
  | { type: 'update'; productId: string; quantity: number; variant?: VariantRef | null }
  | { type: 'remove'; productId: string; variant?: VariantRef | null }
  | { type: 'clear' }
  | { type: 'apply_coupon'; code: string };

export interface AICartAction {
  type: 'add_to_cart' | 'remove_from_cart' | 'update_cart_quantity' | 'clear_cart' | 'set_bargained_price' | 'apply_coupon';
  productId?: string;
  productName?: string;
  quantity?: number;
  variantId?: string;
  variantName?: string;
  variantPrice?: number;
  bargainedPrice?: number;
  originalPrice?: number;
  expiresAt?: string;
  coupon?: { code: string };
}

export interface BargainedPrice {
  bargainedPrice: number;
  originalPrice: number;
  expiresAt: string;
}

export interface VariantRef {
  id?: string;
  name?: string;
}
