"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { HeroCarousel } from '../shared/HeroCarousel';
import { type HeroSection, type Merchant, type Banner } from '@/types/storefront/storefront';

interface HeroSectionProps {
    section: HeroSection;
    merchant: Merchant;
    index?: number;
}

export function HeroSectionComponent({ section, merchant, index = 0 }: HeroSectionProps) {
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="w-full"
        >
            <HeroCarousel banners={finalBanners} />
        </motion.div>
    );
}
