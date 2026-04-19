"use client"

import React from 'react';
import type { TrustCue } from '@/types/storefront/storefront';

interface TrustCuesSectionProps {
    trustCues: TrustCue[];
}

export function TrustCuesSection({ trustCues }: TrustCuesSectionProps) {
    return (
        <div className="py-12 px-1 border-t border-b mb-10" style={{ borderColor: 'var(--store-border)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {trustCues.map((cue, i) => (
                    <div
                        key={i}
                        className="flex flex-col items-center text-center gap-3"
                    >
                        <div className="p-3 rounded-full flex items-center justify-center bg-transparent border-2" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                            {/* We expect cue.icon to be a ReactNode/Lucide icon, but if it's just a string, we render it */}
                            {typeof cue.icon === 'string' ? (
                                <span className="text-xl">{cue.icon}</span>
                            ) : React.isValidElement<{ size?: number; strokeWidth?: number }>(cue.icon) ? (
                                React.cloneElement(cue.icon, { size: 20, strokeWidth: 2.5 })
                            ) : null}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--store-text)' }}>
                                {cue.label}
                            </h3>
                            <p className="text-[11px] font-medium leading-tight opacity-60" style={{ color: 'var(--store-text)' }}>
                                {cue.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
