"use client"

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { type StoreTemplate } from '@/lib/store-templates';

type Banner = {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
};

export function HeroCarousel({ banners, template }: { banners: Banner[]; template?: StoreTemplate }) {
  const [current, setCurrent] = useState(0);
  const heroStyle = template?.styles.hero_style || 'full';

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  if (heroStyle === 'centered') {
    return (
      <div className="relative h-[240px] md:h-[380px] w-full max-w-7xl mx-auto px-4 md:px-8 mt-2 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={banners[current].id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative w-full h-full rounded-[32px] md:rounded-[40px] overflow-hidden shadow-sm"
          >
            <Image
              src={banners[current].image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8'}
              alt={banners[current].id}
                fill
                sizes="(max-width: 768px) calc(100vw - 32px), (max-width: 1280px) calc(100vw - 64px), 1280px"
                className="object-cover"
                priority
              />
            </motion.div>
        </AnimatePresence>

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

  return (
    <div className="relative h-[300px] md:h-[420px] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[current].id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
            <Image
              src={banners[current].image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8'}
              alt={banners[current].id}
              fill
              sizes="(max-width: 768px) calc(100vw - 32px), (max-width: 1280px) calc(100vw - 64px), 1280px"
              className="object-cover"
              priority
            />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-6xl mx-auto w-full px-6 md:px-12">
              <div className="max-w-xl">
                <h1 className="text-2xl md:text-5xl font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                  {banners[current].title}
                </h1>
                <p className="text-sm md:text-lg mb-6 text-white/90">{banners[current].subtitle}</p>
                {banners[current].button_text && (
                  <a
                    href={banners[current].button_link || '#'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-colors"
                    style={{ background: 'var(--primary)' }}
                  >
                    {banners[current].button_text}
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

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
