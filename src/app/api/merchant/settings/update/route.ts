import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_FIELDS = new Set([
  'ai_character_name',
  'ai_character_persona',
  'ai_character_backstory',
  'ai_character_avatar_url',
  'ai_tone',
  'ai_negotiation_style',
  'ai_custom_instructions',
  'bargain_mode_enabled',
  'bargain_ai_personality',
  'ai_provider',
  'ai_api_key',
  'ai_model',
  'ai_auto_negotiation_enabled',
  'ai_mission_visibility_enabled',
  'ai_max_discount_percentage',
  'ai_refund_policy',
  'ai_max_refund_amount',
  'ai_loyalty_policy',
  'ai_shipping_policy',
  'notification_settings',
  'smtp_enabled',
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_password',
  'smtp_from_email',
  'smtp_from_name',
  'custom_domain',
  'shipping_settings',
  'tax_settings',
  'auth_settings',
  'mcp_api_key',
  'google_search_console_id',
  'bing_verification_id',
  'branding_settings',
  'shopify_config',
  'woocommerce_config',
  'ai_responses_enabled',
  'conversation_logging_enabled',
  'abandoned_cart_recovery_enabled',
  'low_stock_alerts_enabled',
  'low_stock_threshold',
  'order_notification_email',
]);

function redactMerchant(merchant: Record<string, unknown>) {
  const redacted = { ...merchant };

  delete redacted.ai_api_key;
  delete redacted.smtp_password;
  delete redacted.mcp_api_key;

  if (redacted.payment_methods && typeof redacted.payment_methods === 'object') {
    const paymentMethods = JSON.parse(JSON.stringify(redacted.payment_methods)) as Record<string, any>;
    if (paymentMethods.stripe && typeof paymentMethods.stripe === 'object') {
      delete paymentMethods.stripe.secret_key;
      delete paymentMethods.stripe.test_secret_key;
      delete paymentMethods.stripe.webhook_secret;
      delete paymentMethods.stripe.test_webhook_secret;
    }
    redacted.payment_methods = paymentMethods;
  }

  if (redacted.shopify_config && typeof redacted.shopify_config === 'object') {
    redacted.shopify_config = {
      ...(redacted.shopify_config as Record<string, unknown>),
      access_token: undefined,
    };
  }

  if (redacted.woocommerce_config && typeof redacted.woocommerce_config === 'object') {
    redacted.woocommerce_config = {
      ...(redacted.woocommerce_config as Record<string, unknown>),
      consumer_key: undefined,
      consumer_secret: undefined,
    };
  }

  return redacted;
}

export async function PATCH(request: Request) {
  const result = await resolveMerchantContext(request, 'settings');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json().catch(() => ({}));
  const rawUpdates = body?.updates;
  const mergeKeys = Array.isArray(body?.mergeKeys) ? body.mergeKeys : [];

  if (!rawUpdates || typeof rawUpdates !== 'object') {
    return NextResponse.json({ error: 'updates is required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawUpdates as Record<string, unknown>)) {
    if (!ALLOWED_FIELDS.has(key)) {
      return NextResponse.json({ error: `Field not allowed: ${key}` }, { status: 400 });
    }
    updates[key] = value;
  }

  const merchant = result.context.merchant as unknown as Record<string, unknown>;
  for (const key of mergeKeys) {
    if (!ALLOWED_FIELDS.has(key) || !(key in updates)) {
      continue;
    }
    const nextValue = updates[key];
    const currentValue = merchant[key];
    if (
      nextValue &&
      typeof nextValue === 'object' &&
      !Array.isArray(nextValue) &&
      currentValue &&
      typeof currentValue === 'object' &&
      !Array.isArray(currentValue)
    ) {
      updates[key] = {
        ...(currentValue as Record<string, unknown>),
        ...(nextValue as Record<string, unknown>),
      };
    }
  }

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .update(updates)
    .eq('id', result.context.merchantId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, merchant: redactMerchant((data || {}) as Record<string, unknown>) });
}
