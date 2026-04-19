"use client"

import React from 'react';
import Image from 'next/image';
import { X, ShoppingCart, Shield, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { Product, ProductVariant, ProductReview, ProductImage, Merchant } from '@/types';

type ProductReviewDetail = ProductReview & {
  content?: string;
  customer_name?: string;
  is_verified?: boolean;
};

type DetailedProduct = Product & {
  specifications?: Record<string, string | number | boolean>;
};

interface ProductDetailDialogProps {
  selectedProduct: DetailedProduct | null;
  setSelectedProduct: (product: DetailedProduct | null) => void;
  productImages: ProductImage[];
  productVariants: ProductVariant[];
  productReviews: ProductReviewDetail[];
  selectedVariant: ProductVariant | null;
  setSelectedVariant: (variant: ProductVariant | null) => void;
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void;
  productDetailLoading: boolean;
  merchant: Merchant;
  addToCart: (product: Product) => void;
  zoomedImage: string | null;
  setZoomedImage: (url: string | null) => void;
}

export const ProductDetailDialog = React.memo(function ProductDetailDialog({
  selectedProduct,
  setSelectedProduct,
  productImages,
  productVariants,
  productReviews,
  selectedVariant,
  setSelectedVariant,
  selectedImageIndex,
  setSelectedImageIndex,
  productDetailLoading,
  merchant,
  addToCart,
  zoomedImage,
  setZoomedImage,
}: ProductDetailDialogProps) {
  return (
    <>
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            id="zoom-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative w-full h-full max-w-3xl max-h-[75vh]"
            >
              <Image src={zoomedImage} alt="Zoomed" fill className="object-contain" />
            </motion.div>
            <button
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors z-[101]"
              onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent
          className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col"
          style={{
            background: 'var(--store-card-bg)',
            borderRadius: 'var(--card-radius)',
          }}
        >
          {selectedProduct && (
            <div className="mx-auto w-full overflow-y-auto">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-[45%] shrink-0 p-4 md:p-5">
                  <div
                    className="aspect-square w-full overflow-hidden relative cursor-zoom-in group"
                    style={{
                      background: 'var(--store-bg)',
                      borderRadius: 'var(--card-radius)',
                    }}
                    onClick={() => {
                      const images = productImages.length > 0 ? productImages : [{ url: selectedProduct.image_url }];
                      setZoomedImage(images[selectedImageIndex]?.url || selectedProduct.image_url || null);
                    }}
                  >
                    <Image
                      src={(productImages.length > 0 ? productImages[selectedImageIndex]?.url : selectedProduct.image_url) || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e'}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    {selectedProduct.stock_quantity !== null && selectedProduct.stock_quantity <= 5 && selectedProduct.stock_quantity > 0 && (
                      <Badge className="absolute top-3 left-3 bg-orange-500 text-[10px] px-2 py-0.5 border-none">
                        Only {selectedProduct.stock_quantity} left
                      </Badge>
                    )}
                  </div>
                  {productImages.length > 1 && (
                    <div className="flex gap-2 mt-2.5 overflow-x-auto scrollbar-hide">
                      {productImages.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`relative w-14 h-14 overflow-hidden flex-shrink-0 border-2 transition-all ${
                            idx === selectedImageIndex ? 'border-primary' : 'border-transparent opacity-50 hover:opacity-100'
                          }`}
                          style={{ borderRadius: 'var(--card-radius-sm)' }}
                        >
                          <Image src={img.url} alt="" fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 p-5 md:pl-0 md:pr-6 md:py-6 flex flex-col">
                  <DialogHeader className="pb-0 space-y-0">
                    <div className="flex items-center justify-between">
                      {selectedProduct.category && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: 'var(--store-text-muted)' }}
                        >
                          {selectedProduct.category}
                        </span>
                      )}
                      <DialogClose asChild>
                        <button className="h-8 w-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity" style={{ background: 'var(--store-bg)' }}>
                          <X className="w-4 h-4" style={{ color: 'var(--store-text-muted)' }} />
                        </button>
                      </DialogClose>
                    </div>
                    <DialogTitle
                      className="text-xl md:text-2xl font-black leading-tight mt-1"
                      style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}
                    >
                      {selectedProduct.name}
                    </DialogTitle>
                    {productReviews.length > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const avgRating = productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length;
                            return (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${star <= avgRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            );
                          })}
                        </div>
                        <span className="text-xs" style={{ color: 'var(--store-text-muted)' }}>
                          ({productReviews.length})
                        </span>
                      </div>
                    )}
                  </DialogHeader>

                  <div className="flex items-baseline gap-3 mt-3">
                    <span className="text-2xl font-black" style={{ color: 'var(--primary)' }}>
                      {formatCurrency(selectedVariant?.price || selectedProduct.price, merchant?.currency, merchant?.locale)}
                    </span>
                    {selectedProduct.stock_quantity !== null && (
                      <span className={`text-[11px] font-semibold ${selectedProduct.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {selectedProduct.stock_quantity > 0 ? 'In stock' : 'Out of stock'}
                      </span>
                    )}
                  </div>

                  <DialogDescription
                    className="text-sm mt-3 leading-relaxed line-clamp-3"
                    style={{ color: 'var(--store-text-muted)' }}
                  >
                    {selectedProduct.description || "No description available."}
                  </DialogDescription>

                  <div className="flex-1 mt-4 space-y-4 overflow-y-auto max-h-[30vh] md:max-h-none">
                    {productDetailLoading && (
                      <div className="space-y-3 animate-pulse">
                        <div className="flex gap-2">
                          {[1,2,3].map(i => (
                            <div key={i} className="h-9 w-20 rounded-lg" style={{ background: 'var(--store-border)' }} />
                          ))}
                        </div>
                      </div>
                    )}
                    {!productDetailLoading && productVariants.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--store-text-muted)' }}>
                          Options
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {productVariants.map((variant) => {
                            const isSelected = selectedVariant?.id === variant.id;
                            const optionLabel = variant.name || [variant.options?.size, variant.options?.color].filter(Boolean).join(' / ') || 'Default';
                            return (
                              <button
                                key={variant.id}
                                onClick={() => setSelectedVariant(isSelected ? null : variant)}
                                className="px-3 py-2 rounded-lg border text-[12px] font-bold transition-all"
                                style={{
                                  color: isSelected ? 'var(--primary)' : 'var(--store-text)',
                                  borderColor: isSelected ? 'var(--primary)' : 'var(--store-border)',
                                  background: isSelected ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
                                }}
                              >
                                {optionLabel}
                                {variant.price && variant.price !== selectedProduct.price && (
                                  <span className="ml-1 text-[10px]" style={{ color: 'var(--store-text-muted)' }}>
                                    {formatCurrency(variant.price, merchant?.currency, merchant?.locale)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!productDetailLoading && selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--store-text-muted)' }}>
                          Specs
                        </h4>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                          {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-[12px] py-1 border-b" style={{ borderColor: 'var(--store-border)' }}>
                              <span className="capitalize" style={{ color: 'var(--store-text-muted)' }}>{key}</span>
                              <span className="font-semibold" style={{ color: 'var(--store-text)' }}>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!productDetailLoading && productReviews.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--store-text-muted)' }}>
                          Reviews
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {productReviews.slice(0, 3).map((review) => (
                            <div
                              key={review.id}
                              className="p-3 rounded-lg border"
                              style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
                                  {review.customer_name?.charAt(0)?.toUpperCase() || 'A'}
                                </div>
                                <span className="text-[12px] font-bold" style={{ color: 'var(--store-text)' }}>
                                  {review.customer_name || 'Anonymous'}
                                </span>
                                <div className="flex items-center gap-0.5 ml-auto">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className={`w-2.5 h-2.5 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                  ))}
                                </div>
                                {review.is_verified && (
                                  <Badge variant="outline" className="text-[8px] text-green-600 border-green-200 bg-green-50 px-1 py-0">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[12px] line-clamp-2" style={{ color: 'var(--store-text-muted)' }}>
                                {review.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--store-bg)' }}
                    >
                      <Shield className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="text-[11px] font-medium" style={{ color: 'var(--store-text-muted)' }}>
                        Authenticity guaranteed by {merchant.store_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-4 pt-4 border-t" style={{ borderColor: 'var(--store-border)' }}>
                    <Button
                      className="flex-1 h-12 text-sm font-black shadow-lg disabled:opacity-50 text-white"
                      style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground, #ffffff)', borderRadius: 'var(--card-radius)' }}
                      disabled={selectedProduct.stock_quantity === 0}
                      onClick={() => {
                        const productToAdd = selectedVariant
                          ? { ...selectedProduct, variant: selectedVariant, price: selectedVariant.price || selectedProduct.price, variantName: selectedVariant.name || [selectedVariant.options?.size, selectedVariant.options?.color].filter(Boolean).join(' / ') }
                          : selectedProduct;
                        addToCart(productToAdd);
                        setSelectedProduct(null);
                      }}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {selectedProduct.stock_quantity === 0 ? 'Out of Stock' : 'Add to Bag'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});
