import { beforeAll, describe, expect, it } from 'vitest';

let computeRazorpayExpectedSignature: typeof import('@/lib/domain/razorpay').computeRazorpayExpectedSignature;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  ({ computeRazorpayExpectedSignature } = await import('@/lib/domain/razorpay'));
});

describe('razorpay domain helpers', () => {
  it('computes the expected signature', () => {
    expect(
      computeRazorpayExpectedSignature({
        orderId: 'order_123',
        paymentId: 'payment_456',
        keySecret: 'secret_key',
      })
    ).toBe('6fa30575650539dde7795ae5458a6f763b629fa21ef7a574ee84849c6ee84f77');
  });

  it('produces a 64-char hex string', () => {
    const sig = computeRazorpayExpectedSignature({
      orderId: 'order_abc',
      paymentId: 'pay_xyz',
      keySecret: 'test_secret',
    });
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different keys produce different signatures', () => {
    const sig1 = computeRazorpayExpectedSignature({ orderId: 'o1', paymentId: 'p1', keySecret: 'key_a' });
    const sig2 = computeRazorpayExpectedSignature({ orderId: 'o1', paymentId: 'p1', keySecret: 'key_b' });
    expect(sig1).not.toBe(sig2);
  });

  it('different order IDs produce different signatures', () => {
    const sig1 = computeRazorpayExpectedSignature({ orderId: 'order_1', paymentId: 'pay_1', keySecret: 'key' });
    const sig2 = computeRazorpayExpectedSignature({ orderId: 'order_2', paymentId: 'pay_1', keySecret: 'key' });
    expect(sig1).not.toBe(sig2);
  });

  it('is deterministic for same inputs', () => {
    const input = { orderId: 'order_x', paymentId: 'pay_y', keySecret: 'secret_z' };
    expect(computeRazorpayExpectedSignature(input)).toBe(computeRazorpayExpectedSignature(input));
  });
});
