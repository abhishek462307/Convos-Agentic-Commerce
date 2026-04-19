import { describe, expect, it } from 'vitest';
import { resolvePaymentProviderConfig } from '@/lib/domain/payment-providers';

describe('payment provider resolver', () => {
  it('resolves stripe test-mode credentials through a shared interface', () => {
    const config = resolvePaymentProviderConfig({
      payment_methods: {
        stripe: {
          enabled: true,
          test_mode: true,
          test_secret_key: 'sk_test_123',
          test_publishable_key: 'pk_test_123',
          test_webhook_secret: 'whsec_test_123',
        },
      },
    }, 'stripe');

    expect(config.enabled).toBe(true);
    expect(config.testMode).toBe(true);
    expect(config.secretKey).toBe('sk_test_123');
    expect(config.publicKey).toBe('pk_test_123');
    expect(config.webhookSecret).toBe('whsec_test_123');
  });

  it('resolves razorpay live credentials through the same interface', () => {
    const config = resolvePaymentProviderConfig({
      payment_methods: {
        razorpay: {
          enabled: true,
          test_mode: false,
          key_id: 'rzp_live_key',
          key_secret: 'rzp_live_secret',
        },
      },
    }, 'razorpay');

    expect(config.enabled).toBe(true);
    expect(config.testMode).toBe(false);
    expect(config.publicKey).toBe('rzp_live_key');
    expect(config.secretKey).toBe('rzp_live_secret');
    expect(config.webhookSecret).toBeNull();
  });

  it('resolves paypal sandbox credentials', () => {
    const config = resolvePaymentProviderConfig({
      payment_methods: {
        paypal: {
          enabled: true,
          test_mode: true,
          test_client_id: 'sb_client_id',
          test_client_secret: 'sb_client_secret',
        },
      },
    }, 'paypal');

    expect(config.enabled).toBe(true);
    expect(config.testMode).toBe(true);
    expect(config.publicKey).toBe('sb_client_id');
    expect(config.secretKey).toBe('sb_client_secret');
    expect(config.webhookSecret).toBeNull();
  });

  it('resolves paypal live credentials', () => {
    const config = resolvePaymentProviderConfig({
      payment_methods: {
        paypal: {
          enabled: true,
          test_mode: false,
          client_id: 'live_client_id',
          client_secret: 'live_client_secret',
        },
      },
    }, 'paypal');

    expect(config.enabled).toBe(true);
    expect(config.testMode).toBe(false);
    expect(config.publicKey).toBe('live_client_id');
    expect(config.secretKey).toBe('live_client_secret');
  });

  it('returns disabled config for missing provider data', () => {
    const config = resolvePaymentProviderConfig({
      payment_methods: {},
    }, 'paypal');

    expect(config.enabled).toBe(false);
    expect(config.publicKey).toBeNull();
    expect(config.secretKey).toBeNull();
  });

  it('handles completely missing payment_methods gracefully', () => {
    const config = resolvePaymentProviderConfig({}, 'stripe');

    expect(config.enabled).toBe(false);
    expect(config.publicKey).toBeNull();
    expect(config.secretKey).toBeNull();
  });
});
