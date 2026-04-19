"use client"

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStoreCart, useStoreSession } from '@/providers/storefront';
import { getStorefrontPath } from '@/lib/storefront/navigation';

interface StorefrontMobileHeaderProps {
  subdomain: string;
  storeName: string;
}

export function StorefrontMobileHeader({ subdomain, storeName }: StorefrontMobileHeaderProps) {
  const router = useRouter();
  const { cart } = useStoreCart();
  const { currentUser, setIsLoginOpen } = useStoreSession();
  
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-[0.5px] border-gray-100 h-16 flex items-center justify-between px-4" style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)', color: 'var(--store-text)' }}>
      <button
        onClick={() => router.back()}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <Link href={getStorefrontPath(subdomain, '/', typeof window !== 'undefined' ? window.location.host : undefined)} className="flex-1 text-center px-4 overflow-hidden">
        <span className="text-[14px] font-black uppercase tracking-[0.2em] truncate block">
          {storeName}
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <button
          onClick={() => currentUser ? router.push(getStorefrontPath(subdomain, '/account', window.location.host)) : setIsLoginOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <User className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => router.push(getStorefrontPath(subdomain, '/cart', window.location.host))}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors relative"
        >
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && (
            <span 
              className="absolute top-1.5 right-1.5 text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center"
              style={{ background: 'var(--primary)' }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
