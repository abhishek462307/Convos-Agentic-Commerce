import { describe, expect, it } from 'vitest';
import { shouldStorefrontAgentAutoRefund } from '@/lib/agentic/storefront-refunds';

describe('shouldStorefrontAgentAutoRefund', () => {
  it('never auto-approves storefront refunds even for trusted customers', () => {
    expect(shouldStorefrontAgentAutoRefund({
      merchantRefundPolicy: 'autonomous',
      trustScore: 98,
      refundMaxAmount: 1000,
      orderAmount: 99,
    })).toBe(false);
  });

  it('never auto-approves storefront refunds when the amount is within limit', () => {
    expect(shouldStorefrontAgentAutoRefund({
      merchantRefundPolicy: 'approval_required',
      trustScore: 85,
      refundMaxAmount: 500,
      orderAmount: 45,
    })).toBe(false);
  });

  it('never auto-approves storefront refunds when policy is disabled', () => {
    expect(shouldStorefrontAgentAutoRefund({
      merchantRefundPolicy: 'disabled',
      trustScore: 100,
      refundMaxAmount: 0,
      orderAmount: 10,
    })).toBe(false);
  });
});
