import type { LucideIcon } from 'lucide-react';
import { BadgePercent, Bot, BrainCircuit, Gift, RotateCcw, ShieldAlert, Target, Truck } from 'lucide-react';
import { getConfidenceLabel, getExperienceTier } from '@/lib/consumer/experience-tier';

const DECISION_TYPE_MAP: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  discount_approved: { label: 'Discount Approved', icon: BadgePercent, color: 'text-vercel-success' },
  refund_approved: { label: 'Refund Approved', icon: RotateCcw, color: 'text-vercel-success' },
  refund_rejected: { label: 'Refund Flagged', icon: ShieldAlert, color: 'text-amber-500' },
  loyalty_reward: { label: 'Loyalty Reward', icon: Gift, color: 'text-vercel-purple' },
  shipping_selected: { label: 'Shipping Choice', icon: Truck, color: 'text-vercel-blue' },
  mission_purchase: { label: 'Mission Purchase', icon: Target, color: 'text-vercel-blue' },
  mcp_interaction: { label: 'MCP Interaction', icon: Bot, color: 'text-purple-500' },
};

export function getDecisionMeta(decisionType: string) {
  return DECISION_TYPE_MAP[decisionType] || { label: decisionType, icon: BrainCircuit, color: 'text-muted-foreground' };
}

export function generateHumanSummary(decision: {
  decision_type: string;
  summary?: string;
  factors?: Record<string, any>;
  outcome?: Record<string, any>;
}): string {
  if (decision.summary) return decision.summary;

  const { decision_type, factors, outcome } = decision;
    const trustLabel = factors?.trust_score ? getConfidenceLabel(factors.trust_score) : null;

    switch (decision_type) {
      case 'mcp_interaction':
        return `Processed MCP tool call: ${factors?.tool_name || 'unknown'}${factors?.params ? ` with params ${JSON.stringify(factors.params)}` : ''}`;
      case 'discount_approved':
        return `Approved ${factors?.discount_pct || '?'}% discount${factors?.bargained_price ? ` — negotiated to ${factors.bargained_price}` : ''}${trustLabel ? `, ${trustLabel.toLowerCase()} confidence customer` : ''}`;
      case 'discount_rejected':
        if (outcome?.reason === 'requires_approval') {
          return 'Discount pending merchant approval';
        }
        return 'Discount rejected';
      case 'shipping_selected':
        if (outcome?.reason === 'requires_approval') {
          return 'Shipping selection pending merchant approval';
        }
        return 'Shipping selected';
      case 'refund_approved':
        return `Auto-approved refund${factors?.order_amount ? ` of ${factors.order_amount}` : ''}${trustLabel ? ` — ${trustLabel.toLowerCase()} confidence customer` : ''}`;
      case 'refund_rejected':
        return `Flagged refund for manual review${trustLabel ? ` — ${trustLabel.toLowerCase()} confidence customer` : ''}${factors?.refund_policy ? `, policy: ${factors.refund_policy}` : ''}`;
    case 'loyalty_reward':
      if (outcome?.granted) {
        return `Granted loyalty reward${outcome.code ? ` (${outcome.code})` : ''}${outcome.discount ? ` — ${outcome.discount} off` : ''}`;
      }
      return `Loyalty reward ${outcome?.reason === 'policy_disabled' ? 'blocked (disabled)' : 'pending approval'}`;
    default:
      return `AI decision: ${decision_type}`;
  }
}

export function formatDecisionFactors(factors: Record<string, any>): { label: string; value: string }[] {
  if (!factors) return [];

  const formatted: { label: string; value: string }[] = [];

  if (factors.trust_score !== undefined) {
    const tier = getExperienceTier(factors.trust_score);
    formatted.push({ label: 'AI Confidence', value: `${tier.confidenceLabel} (${tier.tierLabel})` });
  }
  if (factors.discount_pct !== undefined) {
    formatted.push({ label: 'Discount', value: `${factors.discount_pct}%` });
  }
  if (factors.original_price !== undefined && factors.bargained_price !== undefined) {
    formatted.push({ label: 'Price Range', value: `${factors.original_price} → ${factors.bargained_price}` });
  }
  if (factors.floor_price !== undefined) {
    formatted.push({ label: 'Floor Price', value: String(factors.floor_price) });
  }
  if (factors.refund_policy) {
    formatted.push({ label: 'Refund Policy', value: factors.refund_policy });
  }
  if (factors.loyalty_policy) {
    formatted.push({ label: 'Loyalty Policy', value: factors.loyalty_policy });
  }
  if (factors.reason) {
    formatted.push({ label: 'Reason', value: factors.reason });
  }
  if (factors.order_amount !== undefined) {
    formatted.push({ label: 'Order Amount', value: String(factors.order_amount) });
  }

  return formatted;
}

export function timeAgo(date: string): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
