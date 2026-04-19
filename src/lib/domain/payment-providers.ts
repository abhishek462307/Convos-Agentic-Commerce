export type PaymentProvider = 'stripe' | 'razorpay' | 'paypal';

export interface ResolvedPaymentProviderConfig {
  provider: PaymentProvider
  enabled: boolean
  testMode: boolean
  secretKey: string | null
  publicKey: string | null
  webhookSecret: string | null
  raw: Record<string, any>
}

function asObject(value: any): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function resolvePaymentProviderConfig(merchant: any, provider: PaymentProvider): ResolvedPaymentProviderConfig {
  const paymentMethods = asObject(merchant?.payment_methods);
  const raw = asObject(paymentMethods?.[provider]);
  const testMode = Boolean(raw.test_mode);

  if (provider === 'stripe') {
    return {
      provider,
      enabled: Boolean(raw.enabled),
      testMode,
      secretKey: testMode ? raw.test_secret_key || null : raw.secret_key || null,
      publicKey: testMode ? raw.test_publishable_key || null : raw.publishable_key || null,
      webhookSecret: testMode ? raw.test_webhook_secret || null : raw.webhook_secret || null,
      raw,
    };
  }

  if (provider === 'paypal') {
    return {
      provider,
      enabled: Boolean(raw.enabled),
      testMode,
      publicKey: testMode ? raw.test_client_id || null : raw.client_id || null,
      secretKey: testMode ? raw.test_client_secret || null : raw.client_secret || null,
      webhookSecret: null,
      raw,
    };
  }

  return {
    provider,
    enabled: Boolean(raw.enabled),
    testMode,
    secretKey: testMode ? raw.test_key_secret || null : raw.key_secret || null,
    publicKey: testMode ? raw.test_key_id || null : raw.key_id || null,
    webhookSecret: null,
    raw,
  };
}
