"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Star, Heart,
  Minus, Plus, Package,
  X, Loader2, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getStorefrontPath } from '@/lib/storefront/navigation';
import { formatCurrency, cn } from '@/lib/utils';
import { ProductPageSkeleton } from '@/components/StoreSkeletons';
import { useStoreData, useStoreCart } from '@/providers/storefront';
import { SwiggyProductGrid } from '@/components/SwiggyProductCard';

export default function ProductClient({ subdomain, id }: { subdomain: string; id: string }) {
  const router = useRouter();
  const { merchant, loading: dataLoading } = useStoreData();
  const { cart, addToCart: providerAddToCart, updateQuantity } = useStoreCart();

  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/storefront/${subdomain}/products/${id}`);
        const result = await response.json();
        if (!response.ok || !result?.product) { setLoading(false); return; }
        
        setProduct(result.product);
        setImages(result.images || []);
        setVariants(result.variants || []);
        setReviews(result.reviews || []);
        setRelatedProducts(result.relatedProducts || []);

        if (result.variants?.length > 0) {
          setSelectedVariant(result.variants[0]);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [subdomain, id]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wishlist = JSON.parse(localStorage.getItem(`wishlist_${subdomain}`) || '[]');
      setIsWishlisted(wishlist.includes(id));
    }
  }, [subdomain, id]);

  const toggleWishlist = useCallback(() => {
    const wishlist = JSON.parse(localStorage.getItem(`wishlist_${subdomain}`) || '[]');
    if (isWishlisted) {
      const updated = wishlist.filter((wid: string) => wid !== id);
      localStorage.setItem(`wishlist_${subdomain}`, JSON.stringify(updated));
      setIsWishlisted(false);
      toast.success('Removed from wishlist');
    } else {
      wishlist.push(id);
      localStorage.setItem(`wishlist_${subdomain}`, JSON.stringify(wishlist));
      setIsWishlisted(true);
      toast.success('Added to wishlist');
    }
    window.dispatchEvent(new CustomEvent('wishlist-updated'));
  }, [id, subdomain, isWishlisted]);

  const handleAddToCart = useCallback(() => {
    setAddingToCart(true);
    const productToAdd = selectedVariant 
      ? { ...product, price: selectedVariant.price ?? product.price, variant: { id: selectedVariant.id, name: selectedVariant.name }, variantName: selectedVariant.name } 
      : product;
    
    // Add multiple quantities if selected
    for (let i = 0; i < quantity; i++) {
        providerAddToCart(productToAdd);
    }
    
    toast.success(`${product.name} added to bag!`);
    setTimeout(() => setAddingToCart(false), 800);
  }, [product, selectedVariant, quantity, providerAddToCart]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  }, [product]);

  const currentPrice = selectedVariant?.price || product?.price;
  const comparePrice = product?.compare_at_price;
  const allImages = useMemo(() => images.length > 0 ? images.map(i => i.url) : [product?.image_url].filter(Boolean), [images, product]);
  const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
  const discountPct = comparePrice && comparePrice > currentPrice ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100) : 0;
  const hasSpecs = product?.specifications && Object.keys(product.specifications).length > 0;
  const inStock = product?.stock_quantity === null || product?.stock_quantity > 0;
  const stockLabel = !product?.track_quantity
    ? 'available'
    : product?.stock_quantity > 0
      ? product.stock_quantity <= 5
        ? `only ${product.stock_quantity} left`
        : 'in stock'
      : 'out of stock';

  const tabs = [
    { id: 'description', label: 'Description', show: !!product?.description },
    { id: 'specs', label: 'Details', show: hasSpecs },
    { id: 'reviews', label: `Reviews${reviews.length > 0 ? ` (${reviews.length})` : ''}`, show: true },
  ].filter(t => t.show);

  if (loading || dataLoading) return <ProductPageSkeleton />;

  if (!product || !merchant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Package className="w-12 h-12 opacity-10" />
        <p className="text-[12px] font-black uppercase tracking-[0.2em] opacity-40">Product not found</p>
        <button onClick={() => router.back()} className="text-[11px] font-black uppercase tracking-widest border-b border-black">Go Back</button>
      </div>
    );
  }

  return (
    <div className="relative" style={{ color: 'var(--store-text)' }}>

      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 h-16 md:hidden pointer-events-none">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-md border-[0.5px] border-gray-100 pointer-events-auto shadow-sm rounded-full mt-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-20 md:pt-6 pb-16 md:pb-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,1.04fr)] lg:items-start">
          <div className="space-y-3">
            <div 
              className="relative aspect-[4/5] md:aspect-[0.92] bg-white/90 border border-zinc-200/60 overflow-hidden group cursor-zoom-in rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm"
              onClick={() => setLightboxOpen(true)}
              style={{ borderColor: 'var(--store-border)' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={allImages[selectedImageIndex]}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-full h-full"
                >
                  <Image
                    src={allImages[selectedImageIndex] || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=1200'}
                    alt={product.name}
                    fill
                    priority
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
              
              {discountPct > 0 && (
                <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm">
                  -{discountPct}%
                </div>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="absolute top-4 right-4 h-10 px-4 hidden md:inline-flex items-center justify-center bg-white/85 backdrop-blur-md border-[0.5px] border-gray-100 transition-all active:scale-90 shadow-sm rounded-full text-[12px] font-medium text-zinc-700 hover:text-zinc-900"
              >
                Share
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); toggleWishlist(); }}
                className="absolute bottom-4 right-4 w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-md border-[0.5px] border-gray-100 transition-all active:scale-90 shadow-sm rounded-full"
              >
                <Heart className={cn("w-4 h-4 transition-colors", isWishlisted ? "fill-red-500 text-red-500" : "text-black")} />
              </button>
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {allImages.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => setSelectedImageIndex(idx)}
                    className="relative w-16 h-20 md:w-[72px] md:h-[88px] shrink-0 bg-white/90 border rounded-[22px] overflow-hidden shadow-sm transition-all"
                    style={{
                      borderColor: selectedImageIndex === idx ? 'var(--primary)' : 'color-mix(in srgb, var(--store-border) 85%, white)',
                      boxShadow: selectedImageIndex === idx ? '0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent)' : undefined
                    }}
                  >
                    <Image src={img} alt="" fill className={cn("object-cover transition-opacity", selectedImageIndex === idx ? "opacity-100" : "opacity-30")} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col rounded-[32px] border bg-white/80 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden" style={{ borderColor: 'color-mix(in srgb, var(--store-border) 88%, white)' }}>
            <div className="p-5 md:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="h-px w-8" style={{ background: 'var(--store-text)', opacity: 0.14 }} />
                <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-zinc-500">
                  {product.category_name || 'Collection'}
                </p>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-[28px] md:text-[40px] font-semibold leading-[1.02] tracking-[-0.03em] text-zinc-900">
                  {product.name}
                </h1>
                {product.description && (
                  <p className="line-clamp-2 text-[13px] md:text-[14px] leading-6 max-w-2xl text-zinc-500">
                    {product.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-x-4 gap-y-2.5">
                <div className="flex items-baseline gap-3">
                  <span className="text-[26px] md:text-[32px] font-semibold text-zinc-900">
                    {formatCurrency(currentPrice, merchant?.currency, merchant?.locale)}
                  </span>
                  {comparePrice && comparePrice > currentPrice && (
                    <span className="text-[15px] line-through text-zinc-400 font-medium">
                      {formatCurrency(comparePrice, merchant?.currency, merchant?.locale)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {discountPct > 0 && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ background: 'color-mix(in srgb, var(--primary) 10%, white)', color: 'var(--primary)' }}>
                      Save {discountPct}%
                    </span>
                  )}
                  <span className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    inStock ? '' : 'text-red-600'
                  )} style={inStock ? { background: 'color-mix(in srgb, #0f9f6e 10%, white)', color: '#0f9f6e' } : { background: 'color-mix(in srgb, #dc2626 10%, white)' }}>
                    {stockLabel}
                  </span>
                </div>
              </div>

              {avgRating > 0 && (
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn("w-3.5 h-3.5", star <= Math.round(avgRating) ? "fill-current text-current" : "opacity-10")}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                    {avgRating.toFixed(1)} rating
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                    {reviews.length} reviews
                  </span>
                </div>
              )}

              {variants.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">Choose an option</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant: any) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      return (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          className={cn(
                            "px-4 py-2.5 border text-[11px] font-medium transition-all rounded-full shadow-sm",
                            isSelected ? 'text-white' : 'bg-white/90 text-zinc-700'
                          )}
                          style={isSelected
                            ? { background: 'var(--primary)', borderColor: 'var(--primary)' }
                            : { borderColor: 'color-mix(in srgb, var(--store-border) 88%, white)' }}
                        >
                          {variant.name || variant.options?.size || 'Default'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">Quantity</p>
                  <div className="inline-flex items-center gap-4 rounded-full border bg-white/90 px-3 py-1.5 shadow-sm" style={{ borderColor: 'color-mix(in srgb, var(--store-border) 88%, white)' }}>
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-1.5 hover:opacity-40 transition-opacity">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-[15px] font-semibold min-w-5 text-center text-zinc-900">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="p-1.5 hover:opacity-40 transition-opacity">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!inStock || addingToCart}
                  className="w-full h-14 px-5 text-white inline-flex items-center justify-center gap-2.5 text-[14px] font-semibold tracking-[0.02em] transition-all active:scale-[0.98] disabled:opacity-30 rounded-[20px] border border-transparent shadow-[0_16px_36px_color-mix(in_srgb,var(--primary)_22%,transparent)] hover:-translate-y-[1px]"
                  style={{ background: 'var(--primary)', color: 'var(--primary-foreground, #ffffff)' }}
                >
                  {addingToCart ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      {inStock ? 'Add to Bag' : 'Out of Stock'}
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t px-4 md:px-8" style={{ borderColor: 'var(--store-border)' }}>
              <div className="flex overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "relative px-4 md:px-6 py-4 text-[12px] font-medium whitespace-nowrap transition-colors",
                      activeTab === tab.id ? 'text-zinc-900' : 'text-zinc-400'
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute inset-x-4 md:inset-x-6 bottom-0 h-[2px] rounded-full" style={{ background: 'var(--primary)' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                >
                  {activeTab === 'description' && (
                    <div className="space-y-4">
                      <p className="text-[15px] md:text-[16px] leading-8 whitespace-pre-wrap text-zinc-500">
                        {product.description || 'No description available yet.'}
                      </p>
                    </div>
                  )}

                  {activeTab === 'specs' && hasSpecs && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {Object.entries(product.specifications).map(([key, value]: [string, any]) => (
                        <div key={key} className="rounded-3xl border bg-white px-4 py-4 shadow-sm" style={{ borderColor: 'color-mix(in srgb, var(--store-border) 88%, white)' }}>
                          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 mb-2">{key}</p>
                          <p className="text-[14px] font-semibold text-zinc-900">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div className="space-y-5">
                      {reviews.length > 0 ? reviews.map((review) => (
                        <div key={review.id} className="rounded-3xl border bg-white p-5 shadow-sm" style={{ borderColor: 'color-mix(in srgb, var(--store-border) 88%, white)' }}>
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <p className="text-[12px] font-semibold text-zinc-900">{review.user_name || 'Verified User'}</p>
                              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400 mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={cn("w-3.5 h-3.5", s <= review.rating ? "fill-current text-current" : "opacity-10")} />
                              ))}
                            </div>
                          </div>
                          <p className="text-[14px] leading-7 text-zinc-500">{review.comment}</p>
                        </div>
                      )) : (
                        <div className="py-16 text-center bg-white/60 border border-dashed rounded-3xl" style={{ borderColor: 'color-mix(in srgb, var(--store-border) 88%, white)' }}>
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">No reviews yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-10 md:mt-12">
            <div className="mb-4 md:mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[18px] md:text-[22px] font-semibold tracking-[-0.02em] text-zinc-900">
                  You may also like
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 md:gap-y-10">
              {relatedProducts.slice(0, 6).map((relatedProduct: any) => (
                <SwiggyProductGrid
                  key={relatedProduct.id}
                  product={relatedProduct}
                  merchant={merchant}
                  onSelect={(nextProduct) => router.push(getStorefrontPath(subdomain, `/product/${nextProduct.id}`, window.location.host))}
                  onAddToCart={providerAddToCart}
                  cart={cart}
                  onUpdateQuantity={updateQuantity}
                  subdomain={subdomain}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-8"
            onClick={() => setLightboxOpen(false)}
          >
            <button className="absolute top-8 right-8 text-black hover:opacity-50 transition-colors" onClick={() => setLightboxOpen(false)}>
              <X className="w-10 h-10" />
            </button>
            <div className="relative w-full h-full max-w-6xl" onClick={e => e.stopPropagation()}>
              <Image
                src={allImages[selectedImageIndex]}
                alt=""
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
