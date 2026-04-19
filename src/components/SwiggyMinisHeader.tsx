"use client"

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getStorefrontPath } from '@/lib/storefront/navigation';
import { 
  Share2, 
  MessageCircle, 
  MapPin,
  ShoppingCart,
  Store,
  ExternalLink,
  User,
  LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SwiggyMinisHeaderProps {
  merchant: any;
  branding: any;
  cartCount: number;
  onOpenCart: () => void;
  onOpenLogin?: () => void;
}

export function SwiggyMinisHeader({ merchant, branding, cartCount, onOpenCart, onOpenLogin }: SwiggyMinisHeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [isPreview, setIsPreview] = useState(false);
  const subdomain = merchant?.subdomain;

  useEffect(() => {
    setIsPreview(new URLSearchParams(window.location.search).get('preview') === 'true');
    if (subdomain) {
      const saved = localStorage.getItem(`store_auth_${subdomain}`);
      if (saved) {
        try {
          const session = JSON.parse(saved);
          setUser(session.user);
        } catch {}
      }
    }
  }, [subdomain]);

  const handleLogout = () => {
    localStorage.removeItem(`store_auth_${subdomain}`);
    setUser(null);
    toast.success('Logged out successfully');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: merchant.store_name,
        text: `Check out ${merchant.store_name}!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const socials = branding.social_links || branding.socials || {};
  const address = branding.address || branding.store_address || "Store Location";
  const about = branding.about || branding.store_description || `Premium quality products curated just for you.`;
  const logoWidth = branding.logo_width_mobile || branding.logo_size || 80;
  const logoHeight = branding.logo_height_mobile || branding.logo_size || 80;

  return (
    <div className="relative w-full" style={{ background: 'var(--store-bg)' }}>
      <div className="relative h-[220px] md:h-[280px] w-full overflow-hidden">
        <Image 
          src={branding.cover_url_mobile || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=400&fit=crop'} 
          alt="Cover" 
          fill 
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
        
        <div 
          className="absolute left-4 right-4 flex justify-between items-start z-10 transition-all duration-300"
          style={{ top: isPreview ? '54px' : '16px' }}
        >
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="h-9 w-9 rounded-full backdrop-blur-sm flex items-center justify-center shadow-lg"
              style={{ background: 'var(--store-card-bg)', opacity: 0.9 }}
            >
              <Share2 className="w-4 h-4" style={{ color: 'var(--store-text)' }} />
            </motion.button>

            <div className="flex items-center gap-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      className="h-9 px-3 rounded-full backdrop-blur-sm flex items-center gap-2 shadow-lg"
                      style={{ background: 'var(--store-card-bg)', opacity: 0.9 }}
                    >
                      <User className="w-4 h-4" style={{ color: 'var(--store-text)' }} />
                      <span className="text-[12px] font-medium max-w-[80px] truncate" style={{ color: 'var(--store-text)' }}>
                        {user.name?.split(' ')[0] || 'Account'}
                      </span>
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={getStorefrontPath(subdomain, '/account', typeof window !== 'undefined' ? window.location.host : undefined)} className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        My Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                ) : onOpenLogin ? (
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={onOpenLogin}
                    className="h-9 px-3 rounded-full backdrop-blur-sm flex items-center gap-2 shadow-lg"
                    style={{ background: 'var(--store-card-bg)', opacity: 0.9 }}
                  >
                    <User className="w-4 h-4" style={{ color: 'var(--store-text)' }} />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--store-text)' }}>Login</span>
                  </motion.button>
                ) : (
                  <Link href={getStorefrontPath(subdomain, '/login', typeof window !== 'undefined' ? window.location.host : undefined)}>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      className="h-9 px-3 rounded-full backdrop-blur-sm flex items-center gap-2 shadow-lg"
                      style={{ background: 'var(--store-card-bg)', opacity: 0.9 }}
                    >
                      <User className="w-4 h-4" style={{ color: 'var(--store-text)' }} />
                      <span className="text-[12px] font-medium" style={{ color: 'var(--store-text)' }}>Login</span>
                    </motion.button>
                  </Link>
                )}

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={onOpenCart}
                className="h-9 w-9 rounded-full backdrop-blur-sm flex items-center justify-center shadow-lg relative"
                style={{ background: 'var(--store-card-bg)', opacity: 0.9 }}
              >
                <ShoppingCart className="w-4 h-4" style={{ color: 'var(--store-text)' }} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                    {cartCount}
                  </span>
                )}
              </motion.button>
            </div>
          </div>
      </div>

      <div className="px-4 -mt-16 relative z-10 pb-5">
        <div className="rounded-[32px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-4 border" style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}>
            <div className="flex gap-4">
              <Link
                href={getStorefrontPath(subdomain, '/', typeof window !== 'undefined' ? window.location.host : undefined)}
                className="rounded-[24px] overflow-hidden shrink-0 shadow-sm border-2 transition-opacity hover:opacity-80" 
                style={{ 
                  background: 'var(--store-card-bg)', 
                  borderColor: 'var(--store-border)',
                  width: `${logoWidth}px`,
                  height: `${logoHeight}px`
                }}
              >
                {branding.logo_url ? (
                  <Image src={branding.logo_url} alt="Logo" width={logoWidth} height={logoHeight} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--primary), #FF8C00)` }}>
                    <Store className="w-8 h-8 text-white" />
                  </div>
                )}
              </Link>


            <div className="flex-1 min-w-0 py-1">
              <p className="text-[13px] mt-1 line-clamp-2 leading-snug" style={{ color: 'var(--store-text-muted)' }}>
                {about}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--store-text-muted)' }} />
                <span className="text-[12px] truncate" style={{ color: 'var(--store-text-muted)' }}>{address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--store-border)' }}>
            {socials.instagram && (
                <a 
                  href={socials.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
                  style={{ background: 'var(--store-bg)' }}
                >
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-semibold uppercase tracking-wide" style={{ color: 'var(--store-text)' }}>IG</span>
                  <span className="text-[12px] font-medium" style={{ color: 'var(--store-text)' }}>Instagram</span>
                </a>
            )}
            {socials.whatsapp && (
              <a 
                href={`https://wa.me/${socials.whatsapp}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
                style={{ background: 'var(--store-bg)' }}
              >
                <MessageCircle className="w-4 h-4" style={{ color: 'var(--store-text)' }} />
                <span className="text-[12px] font-medium" style={{ color: 'var(--store-text)' }}>WhatsApp</span>
              </a>
            )}
            {!socials.instagram && !socials.whatsapp && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--store-bg)' }}>
                <ExternalLink className="w-4 h-4" style={{ color: 'var(--store-text-muted)' }} />
                <span className="text-[12px] font-medium" style={{ color: 'var(--store-text-muted)' }}>No socials linked</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
