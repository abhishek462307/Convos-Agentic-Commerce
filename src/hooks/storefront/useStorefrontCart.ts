import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { PRODUCT_SELECT } from '@/lib/product-select';
import { calculateCartTotals } from '@/lib/storefront';
import { formatCurrency } from '@/lib/utils';
import type { CartItem, AppliedCoupon, Product, Merchant } from '@/types';
import type { AICartAction, BargainedPrice } from '@/types/storefront';

interface CartInfo {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  subtotal: number;
  bargainSavings: number;
  discountableAmount: number;
  discount: number;
  total: number;
  hasBargainedItems: boolean;
  cartItemById: Map<string, CartItem>;
  addToCart: (product: Product) => void;
  updateQuantity: (id: string, qty: number, variant?: { id?: string; name?: string } | null) => void;
  removeFromCart: (id: string, variantName?: string | null, variantId?: string | null) => void;
  clearCart: () => void;
  handleCartActions: (actions: AICartAction[], productsContext?: Product[]) => Promise<void>;
  bargainedPrices: Record<string, { bargainedPrice: number; originalPrice: number; expiresAt: string }>;
  showAddedToCart: boolean;
  setShowAddedToCart: (show: boolean) => void;
  lastAddedItems: CartItem[];
}

export function useStorefrontCart(
  subdomain: string,
  merchant: Merchant | null,
  sessionId: string,
  consumerEmail: string | null,
  allProducts: Product[],
  appliedCoupon: AppliedCoupon | null,
  applyCouponCode: (code: string) => Promise<void>
): CartInfo {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [lastAddedItems, setLastAddedItems] = useState<CartItem[]>([]);
  const [bargainedPrices, setBargainedPrices] = useState<Record<string, { bargainedPrice: number; originalPrice: number; expiresAt: string }>>({});

  const cartLoadedRef = useRef(false);
  const cartFetchedRef = useRef(false);
  const cartRef = useRef<CartItem[]>([]);
  const cartSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartLocalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync cartRef whenever cart changes
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const { subtotal, bargainSavings, discountableAmount, discount, total } = useMemo(
    () => calculateCartTotals(cart, appliedCoupon),
    [cart, appliedCoupon]
  );

  const hasBargainedItems = useMemo(() => cart.some((item) => item.bargainedPrice), [cart]);

  const cartItemById = useMemo(() => {
    const map = new Map<string, CartItem>();
    for (const item of cart) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return map;
  }, [cart]);

  // Initial load from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${subdomain}`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        // cart parse failed — reset
      }
    }
    cartLoadedRef.current = true;
  }, [subdomain]);

  // Load from server
  useEffect(() => {
    if (!merchant?.id || cartFetchedRef.current) return;
    cartFetchedRef.current = true;
    const fetchCart = async () => {
      try {
        const res = await fetch(`/api/store/cart?sessionId=${sessionId}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.cart) && data.cart.length > 0 && cart.length === 0) {
          setCart(data.cart);
        }
      } catch {}
    };
    fetchCart();
  }, [merchant?.id, subdomain, sessionId, cart.length]);

  // Persistence to localStorage
  useEffect(() => {
    if (!cartLoadedRef.current) return;
    if (cartLocalTimer.current) clearTimeout(cartLocalTimer.current);
    cartLocalTimer.current = setTimeout(() => {
      localStorage.setItem(`cart_${subdomain}`, JSON.stringify(cart));
    }, 300);
    return () => { if (cartLocalTimer.current) clearTimeout(cartLocalTimer.current); };
  }, [cart, subdomain]);

  // Sync to server
  useEffect(() => {
    if (!merchant?.id) return;
    if (cartSaveTimer.current) clearTimeout(cartSaveTimer.current);
    cartSaveTimer.current = setTimeout(() => {
      fetch('/api/store/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          cart,
          consumerEmail
        })
      }).catch(() => {});
    }, 600);
  }, [cart, subdomain, sessionId, merchant?.id, consumerEmail]);

  const addToCart = useCallback((product: Product & { variant?: { id?: string; name?: string }; variantName?: string }) => {
    setCart(prev => {
      const existing = prev.find(item =>
        item.id === product.id &&
        ((item.variant?.id || null) === (product.variant?.id || null)) &&
        ((item.variantName || null) === (product.variantName || null))
      );
      if (existing) {
        return prev.map(item =>
          item.id === product.id &&
          ((item.variant?.id || null) === (product.variant?.id || null)) &&
          ((item.variantName || null) === (product.variantName || null))
            ? {...item, quantity: item.quantity + 1}
            : item
        );
      }
      return [...prev, {...product, quantity: 1}];
    });
    
    setLastAddedItems([{ ...product, quantity: 1 }]);
    setShowAddedToCart(true);
    setTimeout(() => setShowAddedToCart(false), 5000);
    
    toast.success(`${product.name} added to cart!`);
  }, []);

  const updateQuantity = useCallback((id: string, qty: number, variant?: { id?: string; name?: string } | null) => {
    setCart(prev => {
      const itemExists = prev.find(i =>
        i.id === id &&
        ((i.variant?.id || null) === (variant?.id || null)) &&
        ((i.variantName || null) === (variant?.name || null))
      );
      const isIncreasing = !itemExists || qty > itemExists.quantity;

      if (isIncreasing) {
        const product = allProducts.find(p => p.id === id);
        if (product) {
          setLastAddedItems([{ ...product, quantity: 1, ...(variant ? { variant, variantName: variant.name } : {}) }]);
          setShowAddedToCart(true);
          setTimeout(() => setShowAddedToCart(false), 5000);
        }
      }

      if (qty === 0) {
        return prev.filter(i =>
          !(i.id === id &&
          ((i.variant?.id || null) === (variant?.id || null)) &&
          ((i.variantName || null) === (variant?.name || null)))
        );
      } else {
        if (itemExists) {
          return prev.map(i =>
            i.id === id &&
            ((i.variant?.id || null) === (variant?.id || null)) &&
            ((i.variantName || null) === (variant?.name || null))
              ? {...i, quantity: qty}
              : i
          );
        } else {
          const product = allProducts.find(p => p.id === id);
          return product ? [...prev, { ...product, quantity: qty, ...(variant ? { variant, variantName: variant.name } : {}) }] : prev;
        }
      }
    });
  }, [allProducts]);

  const removeFromCart = useCallback((id: string, variantName?: string | null, variantId?: string | null) => {
    setCart((prev) => prev.filter((item) => !(
      item.id === id &&
      ((item.variant?.id || null) === (variantId || null)) &&
      ((item.variantName || null) === (variantName || null))
    )));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const handleCartActions = useCallback(async (actions: AICartAction[], productsContext?: Product[]) => {
    const addedItems: CartItem[] = [];
    const bargainMap: Record<string, Partial<BargainedPrice> & { bargainedPrice: number }> = {};
    let workingCart = cartRef.current.map(item => ({ ...item }));
    
    for (const action of actions) {
      if (action.type === 'set_bargained_price' && action.productId && action.bargainedPrice) {
        bargainMap[action.productId] = action as Partial<BargainedPrice> & { bargainedPrice: number };
        setBargainedPrices(prev => ({
          ...prev,
          [action.productId!]: {
            bargainedPrice: action.bargainedPrice!,
            originalPrice: action.originalPrice ?? action.bargainedPrice!,
            expiresAt: action.expiresAt ?? new Date(Date.now() + 3600000).toISOString()
          }
        }));
        toast.success(`Deal locked! ${action.productName} at ${formatCurrency(action.bargainedPrice, merchant?.currency, merchant?.locale)} for 1 hour!`);
      } else if (action.type === 'add_to_cart') {
        const productId = action.productId;
        const quantity = action.quantity || 1;
        let product: Product | undefined = productsContext?.find((p) => p.id === productId);
        
        if (!product) {
          const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', productId).single();
          if (error) continue;
          product = data;
        }

        if (product && productId) {
          const selectedVariant = action.variantId
            ? product.variants?.find((variant: { id?: string }) => variant.id === action.variantId) ||
              { id: action.variantId, name: action.variantName, price: action.variantPrice }
            : null;
          const bargain = bargainMap[productId] || (productId ? bargainedPrices[productId] : undefined);
          const finalProduct = bargain 
            ? { ...product, price: selectedVariant?.price ?? product.price, bargainedPrice: bargain.bargainedPrice, originalPrice: selectedVariant?.price ?? product.price }
            : { ...product, price: selectedVariant?.price ?? product.price };
          
          const cartPayload: CartItem = {
            ...finalProduct,
            quantity,
            ...(selectedVariant ? { variant: { id: selectedVariant.id, name: selectedVariant.name }, variantName: selectedVariant.name } : {})
          };
          addedItems.push(cartPayload);
          const existingIndex = workingCart.findIndex(item =>
            item.id === product.id &&
            ((item.variant?.id || null) === (selectedVariant?.id || null)) &&
            ((item.variantName || null) === (selectedVariant?.name || null))
          );
          if (existingIndex >= 0) {
            const existing = workingCart[existingIndex];
            workingCart[existingIndex] = {
              ...existing,
              quantity: existing.quantity + quantity,
              bargainedPrice: bargain?.bargainedPrice || existing.bargainedPrice
            };
          } else {
            workingCart = [...workingCart, cartPayload];
          }
        }
      } else if (action.type === 'remove_from_cart') {
        workingCart = workingCart.filter(item => !(
          item.id === action.productId &&
          ((item.variant?.id || null) === (action.variantId || null)) &&
          ((item.variantName || null) === (action.variantName || null))
        ));
      } else if (action.type === 'update_cart_quantity') {
        workingCart = workingCart.map(item =>
          item.id === action.productId &&
          ((item.variant?.id || null) === (action.variantId || null)) &&
          ((item.variantName || null) === (action.variantName || null))
            ? { ...item, quantity: action.quantity ?? item.quantity }
            : item
        );
      } else if (action.type === 'clear_cart') {
        workingCart = [];
      } else if (action.type === 'apply_coupon' && action.coupon) {
        await applyCouponCode(action.coupon.code);
      }
    }

    setCart(workingCart);

    if (addedItems.length > 0) {
      setLastAddedItems(addedItems);
      setShowAddedToCart(true);
      setTimeout(() => setShowAddedToCart(false), 5000);
      const bargainedItem = addedItems.find(i => i.bargainedPrice);
      if (bargainedItem) {
        toast.success(`${bargainedItem.name} added at your negotiated price!`);
      } else {
        toast.success(`${addedItems.length} item${addedItems.length > 1 ? 's' : ''} added to cart!`);
      }
    }
  }, [merchant, bargainedPrices, applyCouponCode]);

  return {
    cart,
    setCart,
    subtotal,
    bargainSavings,
    discountableAmount,
    discount,
    total,
    hasBargainedItems,
    cartItemById,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    handleCartActions,
    bargainedPrices,
    showAddedToCart,
    setShowAddedToCart,
    lastAddedItems
  };
}
