"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { PromoCodesSection as PromoCodesDisplay } from '@/components/PromoCodesSection';
import type { Discount } from '@/types';

interface PromoCodesSectionProps {
    discounts: Discount[];
    onApply: (code: string) => void;
}

export function PromoCodesSection({ discounts, onApply }: PromoCodesSectionProps) {
    const availableDiscounts = discounts && discounts.length > 0 ? discounts : [];

    if (availableDiscounts.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="py-6"
        >
            <PromoCodesDisplay
                discounts={availableDiscounts}
                onApply={onApply}
            />
        </motion.div>
    );
}
