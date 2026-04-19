"use client"

import React from 'react';
import type { SectionSchema } from '@/types/storefront/sections';
import { SectionHeader } from '@/components/storefront/shared/SectionHeader';

interface WelcomeTextSectionProps {
    section: SectionSchema;
}

export function WelcomeTextSection({ section }: WelcomeTextSectionProps) {
    return (
        <div className="py-12 px-4 text-center">
            <SectionHeader title={section.title || ''} sectionId={section.id} showSparkles={false} className="items-center" />
            <p className="text-sm max-w-xl mx-auto leading-relaxed mt-4" style={{ color: 'var(--store-text-muted)' }}>
                {typeof section.content?.text === 'string' ? section.content.text : String(section.content?.text ?? '')}
            </p>
        </div>
    );
}
