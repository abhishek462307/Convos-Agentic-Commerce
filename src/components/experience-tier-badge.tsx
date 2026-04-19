"use client"

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const config = {
  low: { label: 'Preferred', color: 'bg-vercel-success/10 text-vercel-success' },
  medium: { label: 'Standard', color: 'bg-amber-500/10 text-amber-500' },
  high: { label: 'Restricted', color: 'bg-vercel-error/10 text-vercel-error' }
};

export function ExperienceTierBadge({ riskLevel }: { riskLevel: 'low' | 'medium' | 'high' }) {
  const c = config[riskLevel] || config.medium;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Experience Tier</span>
      <Badge className={cn('text-xs font-bold border-none w-fit', c.color)}>
        {c.label}
      </Badge>
    </div>
  );
}
