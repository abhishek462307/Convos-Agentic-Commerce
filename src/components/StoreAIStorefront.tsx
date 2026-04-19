"use client"

import React from 'react';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { SwiggyProductGrid } from '@/components/SwiggyProductCard';
import { SwiggyCategories } from '@/components/SwiggyCategories';
import { PromoCodesSection } from '@/components/PromoCodesSection';
import { BackgroundBeams } from '@/components/ui/aceternity';
import { CheckoutConfidenceCard, ComparisonCard } from '@/components/AICommercePanels';

interface Banner {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
}

function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  return (
    <div className="relative h-[240px] md:h-[380px] w-full overflow-hidden rounded-[32px] md:rounded-[40px]">
      <Image 
        src={banners[current].image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8'} 
        alt={banners[current].id} 
        fill 
        sizes="100vw"
        className="object-cover" 
      />
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === current}
              className={`h-1 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${idx === current ? 'w-8 bg-white shadow-sm' : 'w-2 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductBundle({ 
  section, 
  merchant, 
  addToCart
}: any) {
  const products = section.products || [];
  const totalOriginal = products.reduce((acc: number, p: any) => acc + Number(p.price), 0);
  const discount = section.discountPercentage || 0;
  const bundlePrice = totalOriginal * (1 - discount / 100);

  const handleAddAll = () => {
    products.forEach((p: any) => {
      const finalPrice = discount > 0 ? Number(p.price) * (1 - discount / 100) : Number(p.price);
      addToCart({ 
        ...p, 
        bargainedPrice: discount > 0 ? finalPrice : undefined,
        originalPrice: p.price 
      });
    });
    toast.success(`Bundle "${section.title}" added to bag!`);
  };

  return (
    <div className="bg-zinc-900 rounded-[40px] p-8 text-white overflow-hidden relative group">
      <BackgroundBeams className="opacity-20" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight leading-none mb-1">{section.title}</h3>
            <p className="text-zinc-400 text-xs font-medium">{section.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {products.map((p: any) => (
            <div key={p.id} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                <Image src={p.image_url} alt={p.name} fill className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{p.name}</p>
                <p className="text-xs text-zinc-400">{formatCurrency(p.price, merchant?.currency, merchant?.locale)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-white/10">
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
              <p className="text-3xl font-black text-primary">{formatCurrency(bundlePrice, merchant?.currency, merchant?.locale)}</p>
              {discount > 0 && (
                <p className="text-lg text-zinc-500 line-through">{formatCurrency(totalOriginal, merchant?.currency, merchant?.locale)}</p>
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {discount > 0 ? `Save ${discount}% with this smart bundle` : 'Curated collection for you'}
            </p>
          </div>
          <Button 
            onClick={handleAddAll}
            className="h-14 px-10 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl bg-primary text-white hover:scale-105 transition-transform"
          >
            Add All to Bag
          </Button>
        </div>
      </div>
    </div>
  );
}


export function AIStorefront({ 
  layout, 
  merchant, 
  onSelectProduct, 
  addToCart, 
  cart, 
  categories, 
  allProducts, 
  discounts,
  onApplyCoupon,
  setSelectedCategory,
  onUpdateQuantity
}: any) {
  return (
    <div className="space-y-12">
      {layout.sections?.map((section: any, idx: number) => {
        const sectionId = section.id || `ai-section-${idx}`;
        
        switch (section.type) {
          case 'hero':
            const banners = section.banners || (section.banner_url ? [{ 
              id: '1', 
              image_url: section.banner_url, 
              title: section.title || '', 
              subtitle: section.subtitle || '' 
            }] : []);
            
            const finalBanners = banners.length > 0 ? banners : (merchant?.branding_settings?.banners || []);
            
            if (finalBanners.length === 0) return null;
            return (
              <motion.div 
                key={sectionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="w-full"
              >
                <HeroCarousel banners={finalBanners} />
              </motion.div>
            );


          case 'product_bundle':
            return (
              <motion.div
                key={sectionId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <ProductBundle 
                  section={section} 
                  merchant={merchant} 
                  onSelectProduct={onSelectProduct}
                  addToCart={addToCart}
                  cart={cart}
                />
              </motion.div>
            );
          
          case 'product_grid':
            let products = section.products || [];
            
            if (products.length === 0) {
              if (section.productIds) {
                products = allProducts.filter((p: any) => section.productIds.includes(p.id));
              } else if (section.category || section.categoryId) {
                const targetCat = (section.category || categories.find((c: any) => c.id === section.categoryId)?.name || '').toLowerCase();
                products = allProducts.filter((p: any) => 
                  (p.category || '').toLowerCase().includes(targetCat) || 
                  p.category_id === section.categoryId
                );
              }
            }
            
            if (products.length === 0) {
              return (
                <div key={sectionId} className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-[32px]">
                  <Package className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
                  <p className="text-zinc-500 font-medium">No products found matching this criteria.</p>
                </div>
              );
            }
            
            return (
              <div key={sectionId} className="animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
                {section.title && (
                  <div className="mb-4 md:mb-5 flex items-center gap-4">
                    {(() => {
                      const normalized = section.title.toLowerCase();
                      const isRecommendation = normalized.includes('recommend') || normalized.includes('like') || normalized.includes('pair');
                      const headingText = isRecommendation ? 'You may also like' : section.title;
                      return (
                        <>
                          <h2
                            className="text-[18px] md:text-[22px] font-semibold tracking-[-0.02em] leading-tight"
                            style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}
                          >
                            {headingText}
                          </h2>
                          <div className="h-px flex-1 bg-zinc-200/70 hidden md:block" />
                        </>
                      );
                    })()}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                  {products.map((p: any) => (
                    <SwiggyProductGrid 
                      key={p.id} 
                      product={p} 
                      merchant={merchant} 
                      onSelect={onSelectProduct} 
                      onAddToCart={addToCart} 
                      cart={cart}
                      onUpdateQuantity={onUpdateQuantity}
                    />
                  ))}
                </div>
              </div>
            );

          case 'comparison':
            if (!section.comparison) return null;
            return (
              <motion.div
                key={sectionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="w-full"
              >
                <ComparisonCard comparison={section.comparison} merchant={merchant} />
              </motion.div>
            );

          case 'checkout_confidence':
            if (!section.checkoutConfidence) return null;
            return (
              <motion.div
                key={sectionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="w-full"
              >
                <CheckoutConfidenceCard confidence={section.checkoutConfidence} merchant={merchant} />
              </motion.div>
            );
          
          case 'category_strip':
            return (
              <div key={sectionId} className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                {section.title && (
                  <h2 className="text-xl font-black mb-5 px-1 tracking-tight" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
                    {section.title}
                  </h2>
                )}
                  <SwiggyCategories 
                      categories={categories} 
                      selectedCategory={null} 
                      onSelect={(name) => {
                      setSelectedCategory(name);
                      if (!name) {
                        const el = document.getElementById('all-products');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }} 
                  />
              </div>
            );

          case 'all_products':
            return (
              <div key={sectionId} id="all-products" className="pt-2">
                {section.title && (
                  <h2 className="text-2xl font-black mb-8 tracking-tight" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
                    {section.title}
                  </h2>
                )}
                {categories.map((cat: any) => {
                  const catProducts = allProducts.filter((p: any) => p.category_id === cat.id || p.category === cat.name);
                  if (catProducts.length === 0) return null;

                  return (
                    <div key={cat.id} id={`category-${cat.id}`} className="mb-12 scroll-mt-20">
                      <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-50">
                        <div>
                          <h3 className="text-lg font-bold tracking-tight text-zinc-900">
                            {cat.name}
                          </h3>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">
                            {catProducts.length} curated items
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {catProducts.map((product: any) => (
                          <SwiggyProductGrid
                            key={product.id}
                            product={product}
                            merchant={merchant}
                            onSelect={onSelectProduct}
                            onAddToCart={addToCart}
                            cart={cart}
                            onUpdateQuantity={onUpdateQuantity}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );

          case 'promo_codes':
            const availableDiscounts = discounts && discounts.length > 0 ? discounts : [];
            if (availableDiscounts.length === 0) return null;

            return (
              <motion.div 
                key={sectionId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="py-6"
              >
                <PromoCodesSection 
                  discounts={availableDiscounts} 
                  onApply={onApplyCoupon}
                />
              </motion.div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
