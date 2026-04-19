"use client"

import React, { useState, useEffect } from 'react';
import { 
    ChevronRight,
    Mail,
    ArrowRight,
    ImageIcon,
    Truck,
    Shield,
    RotateCcw,
    Lock,
    Clock,
    Zap,
    CheckCircle,
    Award,
    Heart
    } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { getTemplateById, getTemplateStyles, storeTemplates } from '@/lib/store-templates';
import { SwiggyMinisHeader } from '@/components/SwiggyMinisHeader';
import { SwiggyProductCard, SwiggyProductGrid } from '@/components/SwiggyProductCard';
import { SwiggyChatInput } from '@/components/SwiggyChatInput';
import { PromoCodesSection } from '@/components/PromoCodesSection';
import { StorefrontFooter } from '@/app/store/[subdomain]/components/StorefrontFooter';

const ICON_MAP: Record<string, any> = {
  'truck': Truck,
  'shield': Shield,
  'rotate-ccw': RotateCcw,
  'lock': Lock,
  'clock': Clock,
  'zap': Zap,
  'check-circle': CheckCircle,
  'award': Award,
  'heart': Heart,
};

interface Banner {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
}

interface Section {
  id: string;
  type: 'hero' | 'categories' | 'best_sellers' | 'all_products' | 'welcome_text' | 'newsletter' | 'promo_codes' | 'popular_products' | 'trust_cues';
  title?: string;
  subtitle?: string;
  content?: any;
  enabled: boolean;
}

interface StoreDesign {
  logo_url: string | null;
  logo_url_desktop?: string | null;
  logo_width_mobile?: number;
  logo_height_mobile?: number;
  logo_width_desktop?: number;
  logo_height_desktop?: number;
  logo_size?: number;
  cover_url_mobile?: string | null;
  socials: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
  };
  primary_color: string;
  announcement_text?: string;
  welcome_message: string;
  hero_title?: string;
  hero_subtitle?: string;
  banners: Banner[];
  sections: Section[];
  product_display_mode: 'grid' | 'carousel';
  template_id: string;
}

  interface StorePreviewProps {
    design: StoreDesign;
    storeName: string;
    subdomain?: string;
    onEditSection?: (sectionId: string) => void;
    products?: any[];
    discounts?: any[];
    merchantContact?: {
      email?: string;
      phone?: string;
      address?: string;
    };
    isDesktop?: boolean;
  }

function NewsletterSection({ primaryColor, content }: { primaryColor: string, content?: any }) {
  return (
    <div 
      className="p-8 md:p-12 group cursor-pointer relative overflow-hidden" 
    >
      <div 
        className="absolute inset-0 opacity-10"
        style={{ backgroundColor: primaryColor }}
      />
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        <div 
          className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform duration-300"
        >
          <Mail className="w-8 h-8 text-primary" style={{ color: primaryColor }} />
        </div>
        <div className="space-y-2">
          <h2 
            className="text-[24px] font-bold"
            style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}
          >
            {content?.title || 'Join the Club'}
          </h2>
          <p className="text-[14px] max-w-[400px] leading-relaxed" style={{ color: 'var(--store-text-muted)' }}>
            {content?.subtitle || 'Get exclusive access to new drops, early sales, and more directly in your inbox.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <Input 
            placeholder="Enter your email" 
            className="h-12 bg-white border shadow-sm rounded-xl px-5 text-[14px]"
            style={{ borderColor: 'var(--store-border)' }}
          />
          <Button 
            className="h-12 px-8 font-bold rounded-xl text-white shadow-lg hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: primaryColor }}
          >
            Subscribe <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function HeroCarousel({ banners, onEdit }: { banners: Banner[], onEdit?: () => void }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners || banners.length === 0) return (
    <div 
      className="h-[180px] bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl m-4 cursor-pointer hover:bg-slate-100 transition-colors"
      onClick={onEdit}
    >
      <div className="text-center">
        <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-[12px] font-bold text-slate-400">No banners added. Click to add.</p>
      </div>
    </div>
  );

  return (
    <div className="relative h-[200px] md:h-[260px] w-full overflow-hidden group px-4 mt-6" onClick={onEdit}>
      <div className="absolute inset-4 bg-primary/0 group-hover:bg-primary/5 -m-1 rounded-2xl border-2 border-transparent group-hover:border-primary/40 transition-all z-20 pointer-events-none" />
      
      <AnimatePresence mode="wait">
          <motion.div
            key={banners[current].id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
          >
            <img 
                src={banners[current].image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8'} 
                alt={banners[current].title || 'Banner'} 
                className="absolute inset-0 w-full h-full object-cover" 
              />
          </motion.div>

      </AnimatePresence>

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrent(idx); }}
              className={`h-1 rounded-full transition-all ${idx === current ? 'w-6 bg-white shadow-sm' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

    export function StorePreview({ design, storeName, subdomain = 'preview', onEditSection, products = [], discounts = [], merchantContact, isDesktop = false }: StorePreviewProps) {
      const [viewMode, setViewMode] = useState<'chat' | 'store'>('store');
      
      const template = getTemplateById(design.template_id) || storeTemplates[0];
      const templateStyles = {
        ...getTemplateStyles(template),
        '--primary': design.primary_color || template.primary_color || '#008060'
      };

      const mockProducts = [
        { id: '1', name: 'Premium Cotton Tee', price: 35.00, category: 'Apparel', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', badge: 'Best Seller' },
        { id: '2', name: 'Minimalist Watch', price: 120.00, category: 'Accessories', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', badge: 'New' },
        { id: '3', name: 'Leather Backpack', price: 85.00, category: 'Accessories', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa', badge: '' },
        { id: '4', name: 'Silk Scarf', price: 45.00, category: 'Apparel', image: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9', badge: '' },
      ];

      const displayProducts = products.length > 0 ? products : mockProducts;

      const renderSection = (section: Section) => {
        if (!section.enabled) return null;

        const mockMerchant = {
          store_name: storeName,
          subdomain,
          currency: 'USD',
          locale: 'en-US',
          branding_settings: design,
          email: merchantContact?.email,
          phone: merchantContact?.phone,
          business_address: merchantContact?.address,
        };

        const displayDiscounts = discounts.length > 0 ? discounts : [
          { id: '1', code: 'WELCOME50', type: 'percentage', value: 50, min_order_amount: 100 },
          { id: '2', code: 'FLAT10', type: 'fixed', value: 10, min_order_amount: 50 }
        ];

        switch (section.type) {
          case 'hero':
            return (
              <div key={section.id} className={`${isDesktop ? 'max-w-7xl mx-auto px-10' : ''} space-y-6`}>
                <div className="group cursor-pointer relative" onClick={() => onEditSection?.(section.id)}>
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -m-2 rounded-lg border-2 border-transparent group-hover:border-primary/40 transition-all z-20" />
                  <HeroCarousel 
                    banners={section.content?.banners || []} 
                    onEdit={() => onEditSection?.(section.id)}
                  />
                </div>
              </div>
            );
          
          case 'promo_codes':
            return (
              <div key={section.id} className={`${isDesktop ? 'max-w-7xl mx-auto px-10' : ''} group cursor-pointer relative`} onClick={() => onEditSection?.(section.id)}>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -m-2 rounded-lg border-2 border-transparent group-hover:border-primary/40 transition-all z-20" />
                <PromoCodesSection 
                  discounts={displayDiscounts} 
                />
              </div>
            );
        
          case 'trust_cues':
            const badges = section.content?.badges || [
              { label: 'Free Shipping', desc: 'Orders over $50', icon: 'truck' },
              { label: 'Secure Pay', desc: '100% protected', icon: 'shield' },
              { label: 'Easy Returns', desc: '30-day policy', icon: 'rotate-ccw' },
              { label: '24/7 Support', desc: 'Always here', icon: 'clock' },
            ];

            return (
              <div key={section.id} className={`${isDesktop ? 'max-w-7xl mx-auto px-10 grid-cols-4' : 'grid-cols-2'} mt-6 px-4 group cursor-pointer relative grid gap-2.5`} onClick={() => onEditSection?.(section.id)}>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -m-2 rounded-lg border-2 border-transparent group-hover:border-primary/40 transition-all z-20" />
                  {badges.map((cue: any, i: number) => {
                    const Icon = ICON_MAP[cue.icon] || Truck;
                    return (
                      <div key={i} className="flex flex-col items-center text-center gap-1 py-3 px-2 rounded-xl border border-slate-100 bg-slate-50/50">
                        <Icon className="w-4 h-4 text-muted-foreground/60 mb-1" />
                        <span className="text-[11px] font-bold" style={{ color: 'var(--store-text)' }}>{cue.label}</span>
                        <span className="text-[9px]" style={{ color: 'var(--store-text-muted)' }}>{cue.desc}</span>
                      </div>
                    );
                  })}
              </div>
            );

          case 'categories':
            return (
              <div key={section.id} className={`${isDesktop ? 'max-w-7xl mx-auto px-10' : ''} mt-6 mb-2 px-4 group cursor-pointer relative`} onClick={() => onEditSection?.(section.id)}>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -m-2 rounded-lg border-2 border-transparent group-hover:border-primary/40 transition-all z-20" />
                <h2 className="text-[16px] font-bold mb-4" style={{ color: 'var(--store-text)' }}>{section.title || 'Browse by Category'}</h2>
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
                {['All Products', 'Apparel', 'Accessories', 'New Arrivals'].map((cat, i) => (
                  <Button 
                    key={cat} 
                    variant={i === 0 ? 'default' : 'outline'} 
                    className={`rounded-xl px-5 h-10 text-[12px] font-bold shrink-0 transition-all ${
                      i === 0 ? 'text-white' : 'bg-white border-slate-200 hover:border-primary'
                    }`}
                    style={i === 0 ? { backgroundColor: design.primary_color } : {}}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          );

          case 'popular_products':
            return (
              <div key={section.id} className={`${isDesktop ? 'max-w-7xl mx-auto px-10' : ''} mt-8 px-4 group cursor-pointer relative`} onClick={() => onEditSection?.(section.id)}>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -m-2 rounded-lg border-2 border-transparent group-hover:border-primary/40 transition-all z-20" />
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-bold" style={{ color: 'var(--store-text)' }}>{section.title || 'Popular Right Now'}</h2>
                  <div className="flex items-center gap-1 text-[12px] font-bold text-primary" style={{ color: design.primary_color }}>
                    View All <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                <div className={`grid ${isDesktop ? 'grid-cols-4' : 'grid-cols-2'} gap-4`}>
                  {displayProducts.slice(0, 4).map(p => (
                    <SwiggyProductGrid 
                      key={p.id} 
                      product={{...p, image_url: p.image_url || p.image}} 
                      merchant={mockMerchant}
                      onSelect={() => {}}
                      onAddToCart={() => {}}
                    />
                  ))}
                </div>
              </div>
            );

          case 'best_sellers':
            return (
              <div key={section.id} className={`${isDesktop ? 'max-w-7xl mx-auto px-10' : ''} mt-8 px-4 group cursor-pointer relative`} onClick={() => onEditSection?.(section.id)}>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -m-2 rounded-lg border-2 border-transparent group-hover:border-primary/40 transition-all z-20" />
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-bold" style={{ color: 'var(--store-text)' }}>{section.title || 'Best Sellers'}</h2>
                  <div className="flex items-center gap-1 text-[12px] font-bold text-primary" style={{ color: design.primary_color }}>
                    View All <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {displayProducts.slice(0, 8).map(p => (
                    <div key={p.id} className="min-w-[160px] w-[160px]">
                      <SwiggyProductGrid 
                        product={{...p, image_url: p.image_url || p.image}} 
                        merchant={mockMerchant}
                        onSelect={() => {}}
                        onAddToCart={() => {}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );

          case 'all_products':
            return (
              <div key={section.id} className={`${isDesktop ? 'max-w-7xl mx-auto px-10' : ''} mt-8 px-4 group cursor-pointer relative`} onClick={() => onEditSection?.(section.id)}>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -m-2 rounded-lg border-2 border-transparent group-hover:border-primary/40 transition-all z-20" />
                <h2 className="text-[16px] font-bold mb-4" style={{ color: 'var(--store-text)' }}>{section.title || 'All Products'}</h2>
                <div className={`rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border ${isDesktop ? 'grid grid-cols-2 gap-4' : ''}`} style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}>
                  {displayProducts.map(p => (
                    <SwiggyProductCard 
                      key={p.id} 
                      product={{...p, image_url: p.image_url || p.image}} 
                      merchant={mockMerchant}
                      onSelect={() => {}}
                      onAddToCart={() => {}}
                    />
                  ))}
                </div>
              </div>
            );

        case 'welcome_text':
          return (
            <div key={section.id} className={`${isDesktop ? 'max-w-3xl mx-auto py-20 px-10' : 'py-12 px-6'} text-center group cursor-pointer relative`} onClick={() => onEditSection?.(section.id)}>
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -m-2 rounded-lg border-2 border-transparent group-hover:border-primary/40 transition-all z-20" />
              <h2 className={`${isDesktop ? 'text-[32px]' : 'text-[22px]'} font-bold leading-tight`} style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>{section.title}</h2>
              <p className={`${isDesktop ? 'text-[16px] mt-6' : 'text-[14px] mt-4'} leading-relaxed mx-auto max-w-xl`} style={{ color: 'var(--store-text-muted)' }}>
                {section.content?.text || 'Add your custom text here to welcome customers or describe your products.'}
              </p>
            </div>
          );

        case 'newsletter':
            return (
              <div key={section.id} className={`${isDesktop ? 'max-w-7xl mx-auto px-10' : ''} my-8 px-4 group cursor-pointer relative`} onClick={() => onEditSection?.(section.id)}>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -m-2 rounded-lg border-2 border-transparent group-hover:border-primary/40 transition-all z-20" />
                <NewsletterSection primaryColor={design.primary_color} content={section.content} />
              </div>
            );

          default:
            return null;
        }
      };

      const mockMerchant = {
        store_name: storeName,
        subdomain,
        currency: 'USD',
        locale: 'en-US',
        branding_settings: design,
      };

      return (
        <div 
          className="w-full h-full bg-white flex flex-col overflow-x-hidden relative" 
          style={{
            ...templateStyles as any,
            background: 'var(--store-bg)',
            color: 'var(--store-text)'
          }}
        >
          {(design.announcement_text || '').trim() ? (
            <div
              className="w-full px-4 py-2 text-center text-white"
              style={{ background: design.primary_color || template.primary_color || '#008060' }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.18em]">
                {design.announcement_text}
              </p>
            </div>
          ) : null}

          <div className={isDesktop ? 'max-w-7xl mx-auto w-full' : ''}>
            <SwiggyMinisHeader 
              merchant={mockMerchant} 
              branding={design} 
              cartCount={0}
              onOpenCart={() => {}}
            />
          </div>

          <div className="flex-1 overflow-y-auto pb-44">
            <AnimatePresence mode="wait">
              {viewMode === 'store' ? (
                <motion.div
                  key="store-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="pb-12">
                    {design.sections.map(section => (
                      <React.Fragment key={section.id}>
                        {renderSection(section)}
                      </React.Fragment>
                    ))}
                    <div className={`pt-8 px-4 ${isDesktop ? 'max-w-7xl mx-auto px-10' : ''}`}>
                      <StorefrontFooter merchant={mockMerchant as any} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="chat-preview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`p-6 space-y-6 ${isDesktop ? 'max-w-2xl mx-auto pt-20' : ''}`}
                  onClick={() => onEditSection?.('chat')}
                >
                  <div className="flex justify-start">
                    <div 
                      className="px-5 py-4 rounded-2xl rounded-tl-none border shadow-sm text-[14px] max-w-[85%] leading-relaxed font-medium"
                      style={{ 
                        background: 'var(--store-card-bg)', 
                        borderColor: 'var(--store-border)',
                        color: 'var(--store-text)',
                        borderRadius: 'var(--card-radius)'
                      }}
                    >
                      {design.welcome_message}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div 
                      className="text-white px-5 py-4 rounded-2xl rounded-tr-none shadow-md text-[14px] max-w-[85%] leading-relaxed font-bold" 
                      style={{ 
                        backgroundColor: design.primary_color,
                        borderRadius: 'var(--card-radius)'
                      }}
                    >
                      Hello! I'm looking for some products.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={isDesktop ? 'max-w-4xl mx-auto w-full px-6 mb-8 relative' : ''}>
            <SwiggyChatInput
              inputText=""
              setInputText={() => {}}
              isListening={false}
              isTyping={false}
              onSubmit={(e) => e?.preventDefault()}
              toggleListening={() => {}}
              quickActions={[]}
              onQuickAction={() => {}}
              showQuickActions={viewMode === 'store'}
              onFocus={() => setViewMode('chat')}
              position={isDesktop ? "relative" : "absolute"}
            />
          </div>
        </div>
      );
    }
