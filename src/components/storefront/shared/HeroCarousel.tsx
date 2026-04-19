"use client"

import React from 'react';
import Image from 'next/image';
import { type Banner } from '@/types/storefront';

interface HeroCarouselProps {
    banners: Banner[];
    autoPlayInterval?: number;
    className?: string;
}

export function HeroCarousel({
    banners,
    autoPlayInterval = 5000,
    className = ''
}: HeroCarouselProps) {
    const [current, setCurrent] = React.useState(0);

    React.useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % banners.length);
        }, autoPlayInterval);
        return () => clearInterval(timer);
    }, [banners.length, autoPlayInterval]);

    if (!banners || banners.length === 0) return null;

    return (
        <div className={`relative h-[400px] md:h-[500px] w-full overflow-hidden rounded-[24px] md:rounded-[32px] ${className}`}>
            <Image
                src={banners[current].image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8'}
                alt={banners[current].title || banners[current].id}
                fill
                sizes="100vw"
                className="object-cover"
                priority={current === 0}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30 flex flex-col justify-center px-10 md:px-16">
                <div className="max-w-2xl">
                    {banners[current].title && (
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-4 tracking-tight drop-shadow-sm">
                            {banners[current].title}
                        </h1>
                    )}
                    {banners[current].subtitle && (
                        <p className="text-sm md:text-base text-white/90 font-medium leading-relaxed mb-8 max-w-lg drop-shadow-sm">
                            {banners[current].subtitle}
                        </p>
                    )}
                    <button 
                        className="text-white px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform w-fit shadow-lg"
                        style={{ background: 'var(--primary)' }}
                    >
                        Shop Collection
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            </div>

            {banners.length > 1 && (
                <div className="absolute bottom-8 right-12 flex gap-2 z-10">
                    {banners.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrent(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            aria-current={idx === current}
                            className={`h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${idx === current ? 'w-10 bg-white shadow-sm' : 'w-2 bg-white/40'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
