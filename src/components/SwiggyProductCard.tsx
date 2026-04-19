"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Plus, Minus, Heart, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';

interface SwiggyProductCardProps {
  product: any;
  merchant: any;
  onSelect: (product: any) => void;
  onAddToCart: (product: any) => void;
  cart?: any[];
  quantity?: number;
  onUpdateQuantity?: (productId: string, quantity: number, variant?: { id?: string; name?: string } | null) => void;
  subdomain?: string;
}

function WishlistHeart({ productId, subdomain }: { productId: string; subdomain?: string }) {
  const [wishlisted, setWishlisted] = useState(false);
  
  useEffect(() => {
    if (!subdomain) return;
    const wishlist = JSON.parse(localStorage.getItem(`wishlist_${subdomain}`) || '[]');
    setWishlisted(wishlist.includes(productId));
    
    const handler = () => {
      const updated = JSON.parse(localStorage.getItem(`wishlist_${subdomain}`) || '[]');
      setWishlisted(updated.includes(productId));
    };
    window.addEventListener('wishlist-updated', handler);
    return () => window.removeEventListener('wishlist-updated', handler);
  }, [productId, subdomain]);

  if (!subdomain) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const wishlist = JSON.parse(localStorage.getItem(`wishlist_${subdomain}`) || '[]');
        const updated = wishlisted ? wishlist.filter((id: string) => id !== productId) : [...wishlist, productId];
        localStorage.setItem(`wishlist_${subdomain}`, JSON.stringify(updated));
        setWishlisted(!wishlisted);
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
      }}
      className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center backdrop-blur-sm transition-all"
      style={{ background: 'rgba(255,255,255,0.8)' }}
    >
      <Heart className={`w-3.5 h-3.5 transition-all ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
    </button>
  );
}

// SwiggyProductCard is the horizontal version (like food delivery)
export function SwiggyProductCard({ 
  product, 
  merchant, 
  onSelect, 
  onAddToCart,
  cart = [],
  onUpdateQuantity
}: SwiggyProductCardProps) {
  const variants = useMemo(() => (Array.isArray(product.variants) ? product.variants : []), [product.variants]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variants[0]?.id || null);
  
  useEffect(() => {
    setSelectedVariantId(variants[0]?.id || null);
  }, [product.id, variants]);

  const selectedVariant = variants.find((variant: any) => variant.id === selectedVariantId) || null;
  const cartItem = cart.find(item =>
    item.id === product.id &&
    ((item.variant?.id || null) === (selectedVariant?.id || null)) &&
    ((item.variantName || null) === (selectedVariant?.name || null))
  );
  const quantity = cartItem?.quantity || 0;
  const aiHighlights = Array.isArray(product.ai_highlights) ? product.ai_highlights.slice(0, 3) : [];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-5 py-6 border-b last:border-b-0 cursor-pointer group"
      style={{ borderColor: 'var(--store-border)' }}
      onClick={() => onSelect(product)}
    >
      <div className="flex-1 min-w-0 pr-2">
        <h3 className="text-[14px] font-black uppercase tracking-tight leading-snug mb-1 group-hover:text-primary transition-colors" style={{ color: 'var(--store-text)' }}>
          {product.name}
        </h3>
        
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[14px] font-black" style={{ color: 'var(--store-text)' }}>
            {formatCurrency(product.price, merchant?.currency, merchant?.locale)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-[11px] line-through text-gray-300 font-bold">
              {formatCurrency(product.original_price, merchant?.currency, merchant?.locale)}
            </span>
          )}
        </div>
        
        {product.description && (
          <p className="text-[12px] leading-relaxed line-clamp-2 text-gray-400 font-medium">
            {product.description}
          </p>
        )}

        {aiHighlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {aiHighlights.map((highlight: string) => (
              <span key={highlight} className="text-[9px] font-black uppercase tracking-widest text-gray-300">
                • {highlight}
              </span>
            ))}
          </div>
        )}
      </div>

        <div className="relative shrink-0 flex flex-col items-center">
          <div className="w-[120px] h-[150px] relative bg-gray-50 border-[0.5px] border-gray-100 overflow-hidden rounded-[24px]">
            <Image 
                src={product.image_url || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&h=200&fit=crop'} 
                alt={product.name} 
                fill
                sizes="120px"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
          </div>
          
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[80px]">
            {quantity === 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(selectedVariant ? { ...product, price: selectedVariant.price ?? product.price, variant: { id: selectedVariant.id, name: selectedVariant.name }, variantName: selectedVariant.name } : product);
                }}
                className="w-full h-8 bg-black text-white flex items-center justify-center font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 transition-colors rounded-[14px]"
              >
                Add
              </button>
            ) : (
              <div className="w-full bg-white border border-black flex items-center justify-between h-8 overflow-hidden rounded-[14px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateQuantity) onUpdateQuantity(product.id, Math.max(0, quantity - 1), selectedVariant ? { id: selectedVariant.id, name: selectedVariant.name } : null);
                  }}
                  className="px-2 h-full hover:bg-gray-50 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-black">{quantity}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateQuantity) onUpdateQuantity(product.id, quantity + 1, selectedVariant ? { id: selectedVariant.id, name: selectedVariant.name } : null);
                  }}
                  className="px-2 h-full hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
  
  // SwiggyProductGrid is the vertical card used in the main grid
  export function SwiggyProductGrid({ 
    product, 
    merchant, 
    onSelect, 
    onAddToCart,
    cart = [],
    onUpdateQuantity,
    subdomain
  }: SwiggyProductCardProps) {
    const variants = useMemo(() => (Array.isArray(product.variants) ? product.variants : []), [product.variants]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variants[0]?.id || null);
    
    useEffect(() => {
      setSelectedVariantId(variants[0]?.id || null);
    }, [product.id, variants]);
  
    const selectedVariant = variants.find((variant: any) => variant.id === selectedVariantId) || null;
    const cartItem = cart.find(item =>
      item.id === product.id &&
      ((item.variant?.id || null) === (selectedVariant?.id || null)) &&
      ((item.variantName || null) === (selectedVariant?.name || null))
    );
    const quantity = cartItem?.quantity || 0;
  
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="group relative flex flex-col h-full w-[82%] mx-auto cursor-pointer"
        onClick={() => onSelect(product)}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-50 border-[0.5px] border-gray-100 rounded-[20px]">
          <WishlistHeart productId={product.id} subdomain={subdomain} />
          <Image 
            src={product.image_url || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=800&fit=crop'} 
            alt={product.name} 
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
          />
  
          {product.badge && (
            <div className="absolute top-3 left-3 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-sm">
              {product.badge}
            </div>
          )}
        </div>
        
        <div className="pt-2 pb-1 flex flex-col flex-1">
          <h3 className="text-[11px] font-black uppercase tracking-tight leading-snug mb-1 group-hover:text-primary transition-colors" style={{ color: 'var(--store-text)' }}>
            {product.name}
          </h3>
  
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-[12px] font-black" style={{ color: 'var(--store-text)' }}>
              {formatCurrency(selectedVariant?.price ?? product.price, merchant?.currency, merchant?.locale)}
            </span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-[9px] line-through text-gray-300 font-bold">
                {formatCurrency(product.original_price, merchant?.currency, merchant?.locale)}
              </span>
            )}
          </div>
  
          <div className="mt-3">
            {quantity === 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(selectedVariant ? { ...product, price: selectedVariant.price ?? product.price, variant: { id: selectedVariant.id, name: selectedVariant.name }, variantName: selectedVariant.name } : product);
                }}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-full border bg-white text-[10px] font-semibold uppercase tracking-[0.16em] transition-all hover:text-white"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.boxShadow = '0 10px 24px color-mix(in srgb, var(--primary) 20%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = 'var(--primary)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Add to Bag
              </button>
            ) : (
              <div className="flex items-center h-10 border overflow-hidden bg-white rounded-full" style={{ borderColor: 'var(--primary)' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateQuantity) onUpdateQuantity(product.id, Math.max(0, quantity - 1), selectedVariant ? { id: selectedVariant.id, name: selectedVariant.name } : null);
                  }}
                  className="flex-1 h-full transition-colors flex items-center justify-center border-r"
                  style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="flex-1 text-[11px] font-semibold text-center" style={{ color: 'var(--primary)' }}>
                  {quantity}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateQuantity) onUpdateQuantity(product.id, quantity + 1, selectedVariant ? { id: selectedVariant.id, name: selectedVariant.name } : null);
                  }}
                  className="flex-1 h-full transition-colors flex items-center justify-center border-l"
                  style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

  );
}
