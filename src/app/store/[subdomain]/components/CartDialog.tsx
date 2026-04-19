"use client"

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, X, Plus, Minus, Tag, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { BargainTimer } from '@/components/StoreMissionStatus';
import { useStoreData, useStoreCart } from '@/providers/storefront';

export const CartDialog = React.memo(function CartDialog({
  isCartOpen,
  setIsCartOpen,
}: {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}) {
  const { merchant } = useStoreData();
  const {
    cart, setCart, appliedCoupon, setAppliedCoupon,
    subtotal, bargainSavings, discount, total, hasBargainedItems,
    applyCouponCode, handleCheckoutClick
  } = useStoreCart();

  const [couponInput, setCouponInput] = useState('');

  const handleApplyCoupon = () => {
    if (couponInput.trim()) {
      applyCouponCode(couponInput.trim()).then(() => setCouponInput(''));
    }
  };

  return (
    <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col"
        style={{
          background: 'var(--store-card-bg)',
          borderRadius: 'var(--card-radius)',
        }}
      >
        <div className="mx-auto w-full overflow-y-auto">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-black" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
                Your Bag
              </DialogTitle>
              <DialogDescription className="text-[11px] font-medium" style={{ color: 'var(--store-text-muted)' }}>
                {cart.reduce((acc, i) => acc + i.quantity, 0)} item{cart.reduce((acc, i) => acc + i.quantity, 0) !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button className="h-8 w-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity" style={{ background: 'var(--store-bg)' }}>
                <X className="w-4 h-4" style={{ color: 'var(--store-text-muted)' }} />
              </button>
            </DialogClose>
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--store-bg)' }}>
                <ShoppingBag className="w-8 h-8" style={{ color: 'var(--store-text-muted)' }} />
              </div>
              <p className="text-base font-bold mb-1" style={{ color: 'var(--store-text)' }}>Your bag is empty</p>
              <p className="text-xs text-center mb-5" style={{ color: 'var(--store-text-muted)' }}>Add items to get started</p>
              <DialogClose asChild>
                <Button style={{ backgroundColor: 'var(--primary)', borderRadius: 'var(--card-radius)' }} className="text-white font-bold h-10 px-6 text-sm">
                  Continue Shopping
                </Button>
              </DialogClose>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 space-y-2.5 max-h-[45vh] overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={`${item.id}-${item.variantName || ''}`}
                    className="flex gap-3 p-2.5 rounded-xl"
                    style={{ background: 'var(--store-bg)' }}
                  >
                    {(() => {
                      const bargainExpiresAt = (item as any).expiresAt as string | undefined;
                      return (
                        <>
                    <div className="w-16 h-16 overflow-hidden shrink-0 relative" style={{ borderRadius: 'var(--card-radius-sm)' }}>
                      <Image
                        src={item.image_url || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e'}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] truncate" style={{ color: 'var(--store-text)' }}>{item.name}</p>
                          {item.variantName && (
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--store-text-muted)' }}>{item.variantName}</p>
                          )}
                        </div>
                        <button
                          className="shrink-0 p-1 rounded-full hover:bg-red-50 transition-colors"
                          onClick={() => setCart(cart.filter(i => !(i.id === item.id && i.variantName === item.variantName)))}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                      {item.bargainedPrice ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[13px] font-bold" style={{ color: 'var(--primary)' }}>
                            {formatCurrency(item.bargainedPrice, merchant?.currency, merchant?.locale)}
                          </span>
                          <span className="text-[10px] line-through" style={{ color: 'var(--store-text-muted)' }}>
                            {formatCurrency(item.price, merchant?.currency, merchant?.locale)}
                          </span>
                          <Badge className="text-[8px] bg-green-100 text-green-700 border-none px-1 py-0">DEAL</Badge>
                          {bargainExpiresAt && <BargainTimer expiresAt={bargainExpiresAt} />}
                        </div>
                      ) : (
                        <span className="text-[13px] font-bold mt-1 block" style={{ color: 'var(--primary)' }}>
                          {formatCurrency(item.price, merchant?.currency, merchant?.locale)}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 w-fit rounded-full border px-0.5" style={{ borderColor: 'var(--store-border)' }}>
                        <button
                          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                          onClick={() => {
                            if (item.quantity === 1) {
                              setCart(cart.filter(i => !(i.id === item.id && i.variantName === item.variantName)));
                            } else {
                              setCart(cart.map(i =>
                                (i.id === item.id && i.variantName === item.variantName)
                                  ? {...i, quantity: i.quantity - 1}
                                  : i
                              ));
                            }
                          }}
                        >
                          <Minus className="w-3 h-3" style={{ color: 'var(--store-text)' }} />
                        </button>
                        <span className="w-5 text-center text-[12px] font-bold" style={{ color: 'var(--store-text)' }}>{item.quantity}</span>
                        <button
                          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                          onClick={() => {
                            setCart(cart.map(i =>
                              (i.id === item.id && i.variantName === item.variantName)
                                ? {...i, quantity: i.quantity + 1}
                                : i
                            ));
                          }}
                        >
                          <Plus className="w-3 h-3" style={{ color: 'var(--store-text)' }} />
                        </button>
                      </div>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>

              <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--store-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 flex items-center h-10 rounded-lg border px-3" style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}>
                    <Tag className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--store-text-muted)' }} />
                    <input
                      placeholder={hasBargainedItems ? "Coupons disabled" : "Coupon code"}
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-[12px] font-medium ml-2"
                      style={{ color: 'var(--store-text)' }}
                      disabled={hasBargainedItems}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="h-10 font-bold text-[12px] px-4"
                    style={{ borderColor: 'var(--store-border)', borderRadius: 'var(--card-radius-sm)' }}
                    onClick={handleApplyCoupon}
                    disabled={hasBargainedItems}
                  >
                    Apply
                  </Button>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg mb-3" style={{ background: 'rgba(34, 197, 94, 0.08)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-green-700">{appliedCoupon.code}</span>
                      <span className="text-[12px] text-green-600">
                        -{appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : formatCurrency(appliedCoupon.discountValue, merchant?.currency, merchant?.locale)}
                      </span>
                    </div>
                    <button onClick={() => setAppliedCoupon(null)} className="text-green-600 hover:text-green-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 mb-3">
                  {bargainSavings > 0 && (
                    <div className="flex justify-between text-[12px] text-green-600">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Bargain Savings
                      </span>
                      <span>-{formatCurrency(bargainSavings, merchant?.currency, merchant?.locale)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[12px]">
                    <span style={{ color: 'var(--store-text-muted)' }}>Subtotal</span>
                    <span className="font-medium" style={{ color: 'var(--store-text)' }}>{formatCurrency(subtotal, merchant?.currency, merchant?.locale)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[12px] text-green-600">
                      <span>Coupon Discount</span>
                      <span>-{formatCurrency(discount, merchant?.currency, merchant?.locale)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black pt-2 border-t" style={{ borderColor: 'var(--store-border)' }}>
                    <span style={{ color: 'var(--store-text)' }}>Total</span>
                    <span style={{ color: 'var(--primary)' }}>{formatCurrency(total, merchant?.currency, merchant?.locale)}</span>
                  </div>
                </div>

                  <Button
                    className="w-full h-12 text-sm font-black shadow-lg text-white"
                    style={{ backgroundColor: 'var(--primary)', borderRadius: 'var(--card-radius)' }}
                    onClick={() => {
                      setIsCartOpen(false);
                      setTimeout(() => handleCheckoutClick(), 150);
                    }}
                  >
                  Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
