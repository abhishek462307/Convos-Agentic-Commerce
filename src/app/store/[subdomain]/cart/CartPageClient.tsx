"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ShoppingBag, Plus, Minus, X, ArrowRight, Tag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CartPageSkeleton } from '@/components/StoreSkeletons'
import { useStoreData, useStoreCart, useStoreSession } from '@/providers/storefront'
import { getStorefrontPath, getStorefrontRoot } from '@/lib/storefront/navigation'

export default function CartPageClient({ subdomain }: { subdomain: string }) {
  const router = useRouter()
  const { merchant, loading: loadingMerchant } = useStoreData()
  const { cart, removeFromCart, updateQuantity, clearCart } = useStoreCart()
  const { currentUser } = useStoreSession()

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')

  const subtotal = cart.reduce((acc, i) => acc + ((i.bargainedPrice || i.price) * i.quantity), 0)
  const originalSubtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
  const bargainSavings = originalSubtotal - subtotal
  const totalQty = cart.reduce((acc, i) => acc + i.quantity, 0)

  let discount = 0
  if (appliedCoupon) {
    const discountableAmount = appliedCoupon.excludeBargainedItems
      ? cart.reduce((acc, i) => i.bargainedPrice ? acc : acc + (i.price * i.quantity), 0)
      : subtotal
    if (appliedCoupon.discountType === 'percentage') {
      discount = discountableAmount * (appliedCoupon.discountValue / 100)
    } else {
      discount = Math.min(appliedCoupon.discountValue, discountableAmount)
    }
  }
  const total = subtotal - discount
  const currentHost = typeof window !== 'undefined' ? window.location.host : undefined
  const storePath = getStorefrontRoot(subdomain, currentHost)

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponError('')
    setApplyingCoupon(true)
    try {
      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput, subdomain, orderAmount: subtotal, eligibleAmount: subtotal }),
      })
      const data = await res.json()
      if (data.success) {
        setAppliedCoupon({ code: data.discount.code, discountType: data.discount.type, discountValue: data.discount.value, excludeBargainedItems: data.excludeBargainedItems })
        setCouponInput('')
      } else {
        setCouponError(data.error || 'Invalid code')
      }
    } catch {
      setCouponError('Failed to apply coupon')
    } finally {
      setApplyingCoupon(false)
    }
  }

  const handleCheckout = () => {
    if (!currentUser) {
      router.push(`${getStorefrontPath(subdomain, '/login', window.location.host)}?redirect=checkout`)
      return
    }
    router.push(getStorefrontPath(subdomain, '/checkout', window.location.host))
  }

  if (loadingMerchant) return <CartPageSkeleton />

  return (
    <div className="min-h-screen" style={{ color: 'var(--store-text)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 pb-28 md:pb-16">

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8" style={{ background: 'var(--store-card-bg)', border: '1px solid var(--store-border)' }}>
              <ShoppingBag className="w-8 h-8 opacity-20" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-3">Your bag is empty</h1>
            <p className="text-sm opacity-40 mb-10 max-w-xs leading-relaxed">Add some items to get started.</p>
            <Link
              href={storePath}
              className="h-12 px-8 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'var(--primary)' }}
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-12 xl:gap-16 items-start">

            {/* ── LEFT: Items ── */}
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-baseline gap-3">
                  <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Your Bag</h1>
                  <span className="text-sm font-bold opacity-25">({totalQty} {totalQty === 1 ? 'item' : 'items'})</span>
                </div>
                <button
                  onClick={() => clearCart()}
                  className="text-[11px] font-bold uppercase tracking-widest opacity-30 hover:opacity-70 transition-opacity"
                >
                  Clear all
                </button>
              </div>

              {/* Item list */}
              <div>
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.div
                      key={`${item.id}-${item.variantName || ''}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="flex gap-4 md:gap-5 py-5 border-b"
                        style={{ borderColor: 'var(--store-border)' }}
                      >
                        {/* Image */}
                        <div
                          className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden flex-shrink-0 relative"
                          style={{ background: 'var(--store-card-bg)', border: '1px solid var(--store-border)' }}
                        >
                          <Image
                            src={item.image_url || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300'}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm md:text-base leading-snug truncate">{item.name}</h3>
                              {item.variantName && (
                                <p className="text-[11px] opacity-40 mt-0.5">{item.variantName}</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id, item.variantName)}
                              className="p-1 rounded-lg opacity-25 hover:opacity-70 transition-opacity flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Price + qty row */}
                          <div className="flex items-center justify-between mt-auto">
                            {/* Qty stepper */}
                            <div
                              className="flex items-center rounded-xl overflow-hidden"
                              style={{ border: '1px solid var(--store-border)', background: 'var(--store-card-bg)' }}
                            >
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant ? { id: item.variant.id, name: item.variantName } : undefined)}
                                className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition-opacity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-[13px] font-bold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant ? { id: item.variant.id, name: item.variantName } : undefined)}
                                className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition-opacity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Line total */}
                            <div className="text-right">
                              <p className="text-sm font-bold">
                                {formatCurrency((item.bargainedPrice || item.price) * item.quantity, merchant?.currency, merchant?.locale)}
                              </p>
                              {item.bargainedPrice && item.bargainedPrice < item.price && (
                                <p className="text-[11px] line-through opacity-30 mt-0.5">
                                  {formatCurrency(item.price * item.quantity, merchant?.currency, merchant?.locale)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Deal badge */}
                          {item.bargainedPrice && item.bargainedPrice < item.price && (
                            <span
                              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full self-start"
                              style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                            >
                              Deal price
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Continue shopping */}
              <Link
                href={storePath}
                className="inline-flex items-center gap-2 mt-8 text-[11px] font-bold uppercase tracking-widest opacity-30 hover:opacity-70 transition-opacity"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Continue Shopping
              </Link>
            </div>

            {/* ── RIGHT: Summary ── */}
            <div className="mt-10 lg:mt-0 lg:sticky lg:top-8">
              <div
                className="rounded-3xl p-6 md:p-7"
                style={{ background: 'var(--store-card-bg)', border: '1px solid var(--store-border)' }}
              >
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-30 mb-6">Order Summary</h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="opacity-50">Subtotal</span>
                    <span className="font-bold">{formatCurrency(subtotal, merchant?.currency, merchant?.locale)}</span>
                  </div>

                  {bargainSavings > 0 && (
                    <div className="flex justify-between text-sm font-medium" style={{ color: 'var(--primary)' }}>
                      <span>Bargain savings</span>
                      <span className="font-bold">−{formatCurrency(bargainSavings, merchant?.currency, merchant?.locale)}</span>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="flex justify-between text-sm font-medium" style={{ color: 'var(--primary)' }}>
                      <span>Coupon ({appliedCoupon.code})</span>
                      <span className="font-bold">−{formatCurrency(discount, merchant?.currency, merchant?.locale)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-medium">
                    <span className="opacity-50">Shipping</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-40">Calculated next</span>
                  </div>
                </div>

                <div className="my-5 h-px" style={{ background: 'var(--store-border)' }} />

                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-black uppercase tracking-wide">Total</span>
                  <span className="text-2xl font-black">{formatCurrency(total, merchant?.currency, merchant?.locale)}</span>
                </div>

                {/* Coupon */}
                <div className="mt-6">
                  {appliedCoupon ? (
                    <div
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                        <span className="text-[12px] font-bold" style={{ color: 'var(--primary)' }}>{appliedCoupon.code} applied</span>
                      </div>
                      <button
                        onClick={() => setAppliedCoupon(null)}
                        className="text-[11px] font-bold opacity-50 hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div
                        className="flex items-center rounded-xl overflow-hidden"
                        style={{ border: '1px solid var(--store-border)', background: 'var(--store-bg)' }}
                      >
                        <input
                          placeholder="Promo code"
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                          onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                          className="flex-1 bg-transparent px-4 py-3 text-[13px] font-medium outline-none placeholder:opacity-30"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={!couponInput.trim() || applyingCoupon}
                          className="px-4 py-3 text-[11px] font-black uppercase tracking-widest disabled:opacity-30 transition-opacity hover:opacity-60"
                          style={{ color: 'var(--primary)' }}
                        >
                          {applyingCoupon ? '…' : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-[11px] text-red-500 font-medium mt-2 px-1">{couponError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Checkout button — desktop */}
                <button
                  onClick={handleCheckout}
                  className="hidden md:flex w-full mt-6 h-13 items-center justify-center gap-2 text-white text-[12px] font-black uppercase tracking-widest rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                  style={{ background: 'var(--primary)', height: '52px', boxShadow: '0 8px 24px color-mix(in srgb, var(--primary) 30%, transparent)' }}
                >
                  Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile sticky checkout bar ── */}
      {cart.length > 0 && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] backdrop-blur-xl"
          style={{ borderColor: 'var(--store-border)', background: 'color-mix(in srgb, var(--store-bg) 92%, transparent)' }}
        >
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Total</p>
              <p className="text-xl font-black leading-none">{formatCurrency(total, merchant?.currency, merchant?.locale)}</p>
            </div>
            <button
              onClick={handleCheckout}
              className="h-12 px-6 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2 active:scale-[0.98] transition-all"
              style={{ background: 'var(--primary)', boxShadow: '0 6px 20px color-mix(in srgb, var(--primary) 28%, transparent)' }}
            >
              Checkout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
