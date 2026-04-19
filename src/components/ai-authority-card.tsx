"use client"

import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, ShieldCheck, Slash, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type PolicyLevel = 'autonomous' | 'approval_required' | 'disabled';

const POLICY_CONFIG: Record<PolicyLevel, {
  label: string;
  description: string;
  accent: string;
  tone: string;
  indicator: string;
  icon: LucideIcon;
}> = {
  autonomous: {
    label: 'Automatic',
    description: 'AI acts on its own',
    accent: 'text-vercel-success',
    tone: 'border-vercel-success/20 bg-vercel-success/5',
    indicator: 'bg-vercel-success',
    icon: Sparkles,
  },
  approval_required: {
    label: 'Ask Me First',
    description: 'AI waits for your okay',
    accent: 'text-amber-500',
    tone: 'border-amber-500/20 bg-amber-500/5',
    indicator: 'bg-amber-500',
    icon: AlertTriangle,
  },
  disabled: {
    label: 'Off',
    description: 'AI cannot do this',
    accent: 'text-vercel-error',
    tone: 'border-vercel-error/20 bg-vercel-error/5',
    indicator: 'bg-vercel-error',
    icon: Slash,
  },
};

interface AuthorityCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  policy: PolicyLevel;
  onPolicyChange: (policy: PolicyLevel) => void;
  maxAmount?: number;
  onMaxAmountChange?: (amount: number) => void;
  maxAmountLabel?: string;
  maxAmountPrefix?: string;
  maxAmountSuffix?: string;
  trustThreshold?: number;
  onTrustThresholdChange?: (threshold: number) => void;
  showTrustThreshold?: boolean;
}

export function AIAuthorityCard({
  icon,
  title,
  description,
  policy,
  onPolicyChange,
  maxAmount,
  onMaxAmountChange,
  maxAmountLabel,
  maxAmountPrefix = '',
  maxAmountSuffix = '',
  showTrustThreshold,
}: AuthorityCardProps) {
  const config = POLICY_CONFIG[policy];
  const FeatureIcon = icon;
  const StateIcon = config.icon;

  return (
    <Card className="overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-sm">
      <CardHeader className="border-b border-border/70 bg-card px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <FeatureIcon className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-[15px] font-semibold tracking-tight text-foreground">{title}</CardTitle>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
          </div>

          <Badge variant="outline" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', config.tone, config.accent)}>
            <StateIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 py-4">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(POLICY_CONFIG) as PolicyLevel[]).map((level) => {
            const option = POLICY_CONFIG[level];
            const OptionIcon = option.icon;
            const isActive = policy === level;

            return (
              <button
                key={level}
                type="button"
                aria-pressed={isActive}
                onClick={() => onPolicyChange(level)}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-2 rounded-[18px] border px-2 py-2.5 text-center transition-colors',
                  isActive
                    ? `${option.tone} ${option.accent}`
                    : 'border-border/70 bg-background hover:bg-muted/30'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                    isActive ? 'bg-current/10' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  <OptionIcon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{option.label}</span>
                    {isActive && <span className={cn('h-2 w-2 rounded-full', option.indicator)} />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StateIcon className={cn('h-3.5 w-3.5 shrink-0', config.accent)} />
          <span>{config.description}</span>
        </div>

        {policy === 'autonomous' && onMaxAmountChange !== undefined && maxAmount !== undefined && (
          <div className="rounded-[18px] border border-border/70 bg-secondary/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {maxAmountLabel || 'Max Amount'}
                </Label>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  Set a limit so the AI stays within a safe amount for your profits.
                </p>
              </div>
              <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-3 flex items-center gap-2">
              {maxAmountPrefix && (
                <span className="text-sm font-medium text-muted-foreground">{maxAmountPrefix}</span>
              )}
              <Input
                type="number"
                value={maxAmount}
                onChange={(e) => onMaxAmountChange(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-28 border-border/70 bg-background text-sm font-medium"
                min={0}
              />
              {maxAmountSuffix && (
                <span className="text-sm font-medium text-muted-foreground">{maxAmountSuffix}</span>
              )}
            </div>

            {showTrustThreshold && (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                High-trust shoppers can move faster, while others might need a manual check.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
