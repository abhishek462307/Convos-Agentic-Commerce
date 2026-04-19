"use client"

import React from 'react';
import { Sparkles } from 'lucide-react';
import { SparklesCore } from '@/components/ui/aceternity';

interface SectionHeaderProps {
    title: string;
    showSparkles?: boolean;
    showAIIcon?: boolean;
    onSeeAll?: () => void;
    sectionId: string;
    className?: string;
}

export function SectionHeader({
    title,
    showSparkles = true,
    showAIIcon = false,
    onSeeAll,
    sectionId,
    className = ''
}: SectionHeaderProps) {
    const isAISection = showAIIcon || title.toLowerCase().includes('recommend') ||
        title.toLowerCase().includes('like') ||
        title.toLowerCase().includes('pair');

    return (
        <div className={`flex flex-col mb-3 relative ${className}`}>
            <div className="flex items-center justify-between">
                <h2 className="text-[16px] md:text-[18px] font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
                    {isAISection && (
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                        </div>
                    )}
                    {title}
                </h2>
                <div className="h-[1px] flex-1 mx-4 hidden md:block" style={{ background: 'color-mix(in srgb, var(--store-text-muted) 20%, transparent)' }} />
            </div>
            {showSparkles && (
                <div className="w-full h-0.5 mt-1 relative overflow-hidden rounded-full">
                    <SparklesCore
                        id={`sparkles-${sectionId}`}
                        background="transparent"
                        minSize={0.4}
                        maxSize={1}
                        particleDensity={1200}
                        className="w-full h-full"
                        particleColor="var(--primary)"
                    />
                </div>
            )}
        </div>
    );
}
