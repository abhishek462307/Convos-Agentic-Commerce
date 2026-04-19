"use client"

import { Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExperienceTier } from '@/lib/consumer/experience-tier';

export function AIConfidenceBadge({ trustScore }: { trustScore: number }) {
  const tier = getExperienceTier(trustScore);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Brain className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Confidence</span>
      </div>
      <Badge className={cn('text-xs font-bold border-none w-fit', tier.bgColor, tier.color)}>
        {tier.confidenceLabel}
      </Badge>
      <span className="text-[10px] text-muted-foreground">{tier.tierLabel} &middot; {tier.description}</span>
    </div>
  );
}
