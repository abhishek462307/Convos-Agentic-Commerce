"use client"

import React, { useRef } from 'react';
import { Tag, Ticket, ChevronRight, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { MovingBorder } from '@/components/ui/aceternity/moving-border';
import { cn } from '@/lib/utils';

interface Discount {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order_amount?: number;
}

interface PromoCodesSectionProps {
  discounts: Discount[];
  onApply?: (code: string) => void;
}

export function PromoCodesSection({ discounts, onApply }: PromoCodesSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!discounts || discounts.length === 0) return null;

  return (
    <div className="mb-10 mt-4">
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="text-[14px] font-black uppercase tracking-wider" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
          Special Offers For You
        </h2>
      </div>
      
      <div 
        ref={containerRef}
        className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 snap-x"
      >
        {discounts.map((discount) => {
          const isFreeShip = discount.code.toLowerCase().includes('ship') || discount.code.toLowerCase().includes('free');
          return (
            <div key={discount.id} className="min-w-[280px] md:min-w-[340px] snap-start">
              <div
                className={cn(
                  "p-6 rounded-[28px] flex items-center relative overflow-hidden h-[120px] shadow-sm transition-all hover:shadow-md",
                  isFreeShip ? "bg-amber-900 text-white" : "bg-white border text-black"
                )}
                style={!isFreeShip ? { borderColor: 'var(--store-border)' } : {}}
              >
                <div className="flex-1 relative z-10 pr-4">
                  <div className="flex items-center gap-1.5 mb-1 opacity-70">
                    <Tag className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      CODE: {discount.code}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black leading-tight">
                    {discount.type === 'percentage' ? `${discount.value}% OFF` : `Flat ${discount.value} OFF`}
                  </h3>
                  {discount.min_order_amount && (
                    <p className="text-[11px] font-medium opacity-60 mt-1">
                      On orders over {discount.min_order_amount}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="h-full w-px border-l border-dashed border-current opacity-20 mx-2" />

                <div className="flex flex-col items-center justify-center shrink-0 pl-4">
                  <button 
                    onClick={() => handleCopy(discount.code)}
                    className="text-[11px] font-black uppercase tracking-widest rotate-90 whitespace-nowrap hover:opacity-70 transition-opacity"
                  >
                    {copiedCode === discount.code ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
