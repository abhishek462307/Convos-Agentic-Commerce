"use client"

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Sparkles, User, ShoppingBag, Store, Phone } from 'lucide-react';
import {
  useStoreData, 
  useStoreCart, 
  useStoreSession 
} from '@/providers/storefront';
import { getStorefrontPath } from '@/lib/storefront/navigation';

export function StorefrontDesktopHeader({
  showAiStoreButton,
  onAiStoreClick,
  showCallbackButton,
  onCallbackClick,
}: {
  showAiStoreButton: boolean;
  onAiStoreClick?: () => void;
  showCallbackButton?: boolean;
  onCallbackClick?: () => void;
}) {
  const router = useRouter();
  const { merchant, loaderConfig, searchQuery, setSearchQuery } = useStoreData();
    const { cart } = useStoreCart();
    const { currentUser, setIsLoginOpen, subdomain } = useStoreSession();
    const { categories } = useStoreData();

    if (!merchant) return null;

    const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
    const branding = merchant.branding_settings || {};
    const announcementText = branding.announcement_text || "Free global shipping on orders over $100 | Use code WELCOME to get 10% off";

    return (
      <div className="sticky top-0 z-30 border-b" style={{ borderColor: 'var(--store-border)', background: 'var(--store-bg)' }}>
        {/* Announcement Bar */}
        <div className="w-full text-white py-2 px-4 text-center" style={{ background: 'var(--primary)' }}>
          <p className="text-[10px] md:text-[11px] font-medium tracking-wider uppercase">
            {announcementText}
          </p>
        </div>

        <div className="max-w-[1400px] mx-auto px-8">
            <div className="flex items-center gap-10 h-20">
              <Link href={getStorefrontPath(subdomain, '/', typeof window !== 'undefined' ? window.location.host : undefined)} className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
                {loaderConfig.logoUrlDesktop || loaderConfig.logoUrl ? (
                  <div 
                    className="relative overflow-hidden" 
                    style={{ 
                      width: `${(loaderConfig.logoWidthDesktop || 120) * 0.5}px`,
                      height: `${(loaderConfig.logoHeightDesktop || 40) * 0.5}px`
                    }}
                  >
                    <Image src={loaderConfig.logoUrlDesktop || loaderConfig.logoUrl!} alt="" fill sizes="120px" className="object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                    <Store className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </Link>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link href={getStorefrontPath(subdomain, '/', typeof window !== 'undefined' ? window.location.host : undefined)} className="text-[13px] font-bold hover:text-primary transition-colors">
                Home
              </Link>
              {categories.slice(0, 5).map((category) => (
                <Link 
                  key={category.id} 
                  href={getStorefrontPath(subdomain, `/category/${category.id}`, typeof window !== 'undefined' ? window.location.host : undefined)}
                  className="text-[13px] font-bold hover:text-primary transition-colors whitespace-nowrap"
                >
                  {category.name}
                </Link>
              ))}
            </nav>


            <div className="flex items-center h-10 rounded-full border px-4 flex-1 max-w-[320px] transition-all focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px] focus-within:shadow-primary/5 ml-auto" style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}>
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--store-text-muted)' }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-transparent border-none outline-none text-[13px] ml-2.5"
                style={{ color: 'var(--store-text)' }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="shrink-0 hover:opacity-70 transition-opacity">
                  <X className="w-3.5 h-3.5" style={{ color: 'var(--store-text-muted)' }} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 shrink-0">
                {showCallbackButton && (
                  <button
                    onClick={onCallbackClick}
                    className="h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 border transition-all hover:border-primary/30"
                    style={{ borderColor: 'var(--store-border)', background: 'var(--store-card-bg)' }}
                  >
                    <Phone className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--store-text)' }}>Request Callback</span>
                  </button>
                )}
                {showAiStoreButton && (
                  <button
                    onClick={onAiStoreClick}
                    className="h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 border transition-all hover:border-primary/30"
                    style={{ borderColor: 'var(--store-border)', background: 'var(--store-card-bg)' }}
                  >
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--store-text)' }}>AI Store</span>
                  </button>
                )}
              {currentUser ? (
                <Link
                  href={getStorefrontPath(subdomain, '/account', typeof window !== 'undefined' ? window.location.host : undefined)}
                  className="h-9 px-4 flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
                >
                  <User className="w-4 h-4" style={{ color: 'var(--store-text)' }} />
                  <span className="text-[13px] font-bold" style={{ color: 'var(--store-text)' }}>Account</span>
                </Link>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="h-9 px-4 flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
                  aria-label="Login"
                >
                  <User className="w-4 h-4" style={{ color: 'var(--store-text)' }} />
                  <span className="text-[13px] font-bold" style={{ color: 'var(--store-text)' }}>Login</span>
                </button>
              )}
              <button
                  onClick={() => router.push(getStorefrontPath(subdomain, '/cart', window.location.host))}
                  className="h-10 w-10 rounded-full flex items-center justify-center relative transition-all hover:opacity-90 border"
                style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}
                aria-label="Cart"
              >
                <ShoppingBag className="w-4 h-4" style={{ color: 'var(--store-text)' }} />
                {cartCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
                    style={{ background: 'var(--primary)' }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
