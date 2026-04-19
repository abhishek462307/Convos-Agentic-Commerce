import { beforeAll, describe, expect, it } from 'vitest';

let getDecisionNotificationType: typeof import('@/lib/domain/decision-approvals').getDecisionNotificationType;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  ({ getDecisionNotificationType } = await import('@/lib/domain/decision-approvals'));
});

describe('decision approval helpers', () => {
  it('maps approval decision types to customer notification types', () => {
    expect(getDecisionNotificationType('refund_rejected')).toBe('refund');
    expect(getDecisionNotificationType('loyalty_reward')).toBe('loyalty');
    expect(getDecisionNotificationType('discount_rejected')).toBe('discount');
    expect(getDecisionNotificationType('shipping_selected')).toBe('shipping');
    expect(getDecisionNotificationType('unknown')).toBe('update');
  });
});
