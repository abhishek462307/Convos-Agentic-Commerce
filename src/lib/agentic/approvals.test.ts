import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {},
}));

vi.mock('@/lib/agentic/events', () => ({
  logDomainEvent: vi.fn(),
}));

let getDecisionApprovalDomain: typeof import('@/lib/agentic/approvals').getDecisionApprovalDomain;
let describeDecisionApprovalPolicy: typeof import('@/lib/agentic/approvals').describeDecisionApprovalPolicy;

beforeAll(async () => {
  ({ getDecisionApprovalDomain, describeDecisionApprovalPolicy } = await import('@/lib/agentic/approvals'));
});

describe('approval core', () => {
  const merchant = {
    ai_refund_policy: 'approval_required',
    ai_loyalty_policy: 'approval_required',
    ai_shipping_policy: 'autonomous',
    ai_max_discount_percentage: 15,
    ai_max_refund_amount: 200,
  } as any;

  it('maps decision types to shared approval domains', () => {
    expect(getDecisionApprovalDomain('refund_rejected')).toBe('refunds');
    expect(getDecisionApprovalDomain('loyalty_reward')).toBe('loyalty');
    expect(getDecisionApprovalDomain('discount_rejected')).toBe('pricing');
    expect(getDecisionApprovalDomain('shipping_selected')).toBe('shipping');
    expect(getDecisionApprovalDomain('unknown')).toBe('update');
  });

  it('produces policy summaries for pending decision approvals', () => {
    const refundPolicy = describeDecisionApprovalPolicy(merchant, {
      decision_type: 'refund_rejected',
      factors: { order_amount: 120 },
    });
    const pricingPolicy = describeDecisionApprovalPolicy(merchant, {
      decision_type: 'discount_rejected',
      factors: { original_price: 100, requested_price: 70 },
    });

    expect(refundPolicy.allowed).toBe(true);
    expect(refundPolicy.requiresApproval).toBe(true);
    expect(pricingPolicy.domain).toBe('pricing');
    expect(pricingPolicy.requiresApproval).toBe(true);
  });
});
