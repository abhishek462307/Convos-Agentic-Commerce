import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendApprovalNotificationEmail } from '@/lib/email';
import { createStripeOrderCheckoutSession } from '@/lib/domain/stripe-checkout';
import { createMerchantDiscount } from '@/lib/domain/discounts';
import { resolvePaymentProviderConfig } from '@/lib/domain/payment-providers';
import {
  describeDecisionApprovalPolicy,
  getDecisionApprovalDomain,
  recordApprovalLifecycleEvent,
} from '@/lib/agentic/approvals';

interface DecisionLog {
  id: string;
  merchant_id: string;
  decision_type: string;
  outcome?: Record<string, unknown>;
  consumer_email?: string;
  session_id?: string;
  order_id?: string;
  factors?: Record<string, unknown>;
  override_status?: string;
  override_reason?: string;
  overridden_at?: string;
  [key: string]: unknown;
}

interface DecisionMerchant {
  subdomain?: string;
  custom_domain?: string | null;
  domain_verified?: boolean;
  store_name?: string;
  smtp_enabled?: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
  payment_methods?: Record<string, unknown>;
  shipping_settings?: { zones?: ShippingZone[] };
  tax_settings?: { enabled?: boolean; default_rate?: number; country_rates?: TaxCountryRate[] };
  currency?: string;
  ai_max_discount_percentage?: number;
  ai_refund_policy?: Record<string, unknown>;
  ai_loyalty_policy?: Record<string, unknown>;
  ai_shipping_policy?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ShippingZone {
  countries?: string[];
  rates?: { price: number }[];
}

interface TaxCountryRate {
  country_code: string;
  rate: number;
  tax_name?: string;
}

interface DecisionCartItem {
  id: string;
  quantity: number;
  price?: number;
}

interface DecisionOutcome {
  [key: string]: unknown;
}

interface DecisionApprovalInput {
  decision: DecisionLog;
  merchant: DecisionMerchant;
  merchantId: string;
  decisionLogId: string;
}

function generateLoyaltyDiscountCode() {
  return `LOYALTY${Math.floor(1000 + Math.random() * 9000)}`;
}

export function getDecisionNotificationType(decisionType: string) {
  if (decisionType === 'refund_rejected') return 'refund';
  if (decisionType === 'loyalty_reward') return 'loyalty';
  if (decisionType === 'discount_rejected') return 'discount';
  if (decisionType === 'shipping_selected') return 'shipping';
  return 'update';
}

async function approveRefundDecision(input: DecisionApprovalInput) {
  if (input.decision.order_id) {
    const { data: existingRefund } = await supabaseAdmin
      .from('refunds')
      .select('id')
      .eq('order_id', input.decision.order_id)
      .eq('merchant_id', input.merchantId)
      .single();

    if (!existingRefund) {
      await supabaseAdmin.from('refunds').insert({
        order_id: input.decision.order_id,
        merchant_id: input.merchantId,
        consumer_email: input.decision.consumer_email || '',
        reason: input.decision.factors?.reason || 'Approved by merchant',
        status: 'approved',
        amount: input.decision.factors?.order_amount || null,
      });
    } else {
      await supabaseAdmin
        .from('refunds')
        .update({ status: 'approved' })
        .eq('order_id', input.decision.order_id)
        .eq('merchant_id', input.merchantId);
    }
  }

  const newOutcome = { approved: true, reason: 'manual_approval' };
  await supabaseAdmin
    .from('ai_decision_log')
    .update({
      decision_type: 'refund_approved',
      outcome: newOutcome,
    })
    .eq('id', input.decisionLogId);

  if (input.decision.consumer_email && input.merchant) {
    await sendApprovalNotificationEmail({
      type: 'refund',
      customerName: input.decision.consumer_email.split('@')[0],
      customerEmail: input.decision.consumer_email,
      storeName: input.merchant.store_name || 'Store',
      message: 'Your refund has been approved. We are processing it now.',
    }, input.merchant);
  }

  return newOutcome;
}

async function approveLoyaltyDecision(input: DecisionApprovalInput) {
  const discountCode = generateLoyaltyDiscountCode();
  await createMerchantDiscount({
    merchantId: input.merchantId,
    actorType: 'user',
    code: discountCode,
    type: 'percentage',
    value: 15,
    usageLimit: 1,
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    context: {
      decisionLogId: input.decisionLogId,
      source: 'manual_approval',
    },
  });

  const newOutcome = { granted: true, code: discountCode, discount: '15%', reason: 'manual_approval' };
  await supabaseAdmin
    .from('ai_decision_log')
    .update({ outcome: newOutcome })
    .eq('id', input.decisionLogId);

  if (input.decision.consumer_email && input.merchant) {
    await sendApprovalNotificationEmail({
      type: 'loyalty',
      customerName: input.decision.consumer_email.split('@')[0],
      customerEmail: input.decision.consumer_email,
      storeName: input.merchant.store_name || 'Store',
      message: `You have received a loyalty reward: ${discountCode} for 15% off.`,
    }, input.merchant);
  }

  return newOutcome;
}

async function approveDiscountDecision(input: DecisionApprovalInput) {
  const productId = input.decision.factors?.product_id;
  const requestedPrice = Number(input.decision.factors?.requested_price);
  if (!productId || !requestedPrice || !input.decision.session_id) {
    return { approved: true, reason: 'manual_approval' };
  }

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, name, price, bargain_min_price')
    .eq('id', productId)
    .single();

  if (!product || product.bargain_min_price === null) {
    return { approved: true, reason: 'manual_approval' };
  }

  const discountPct = Math.round(((product.price - requestedPrice) / product.price) * 100);
  
  // We allow the merchant to approve any price below the original price,
  // even if it exceeds the AI's negotiated range or the global max discount.
  // Manual approval is the ultimate authority.
  if (requestedPrice >= product.price || requestedPrice <= 0) {
    throw new Error('Approved price must be greater than 0 and less than the original price');
  }

  await supabaseAdmin.from('bargained_prices').insert({
    merchant_id: input.merchantId,
    product_id: productId,
    session_id: input.decision.session_id,
    original_price: product.price,
    bargained_price: requestedPrice,
    discount_percentage: discountPct,
    status: 'active',
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  const newOutcome = { approved: true, price: requestedPrice, discount_pct: discountPct, reason: 'manual_approval' };
  await supabaseAdmin
    .from('ai_decision_log')
    .update({
      decision_type: 'discount_approved',
      outcome: newOutcome,
    })
    .eq('id', input.decisionLogId);

  if (input.decision.consumer_email && input.merchant) {
    await sendApprovalNotificationEmail({
      type: 'discount',
      customerName: input.decision.consumer_email.split('@')[0],
      customerEmail: input.decision.consumer_email,
      storeName: input.merchant.store_name || 'Store',
      message: `Your negotiated price for ${product.name} has been approved. Reply "add to cart" to lock it in.`,
    }, input.merchant);
  }

  return newOutcome;
}

async function approveShippingDecision(input: DecisionApprovalInput) {
  const decisionAction = input.decision.factors?.action;
  if (decisionAction !== 'payment_link') {
    const newOutcome = { approved: true, reason: 'manual_approval' };
    await supabaseAdmin.from('ai_decision_log').update({ outcome: newOutcome }).eq('id', input.decisionLogId);
    return newOutcome;
  }

  const merchantSubdomain = input.merchant?.subdomain;
  if (!merchantSubdomain) {
    throw new Error('Merchant storefront handle is missing');
  }
  const cart = (input.decision.factors?.cart || []) as DecisionCartItem[];
  const customerInfo = (input.decision.factors?.customerInfo || {}) as Record<string, string>;
  const bargainedPrices = (input.decision.factors?.bargainedPrices || null) as Record<string, number | { bargainedPrice: number }> | null;

  const stripeConfig = resolvePaymentProviderConfig(input.merchant, 'stripe');
  if (!stripeConfig.enabled) {
    throw new Error('Stripe is not enabled for this store');
  }

  const secretKey = stripeConfig.secretKey;
  if (!secretKey) {
    throw new Error(`Stripe ${stripeConfig.testMode ? 'test' : 'live'} secret key is missing`);
  }

  const productIds = Array.from(new Set(cart.map((item: DecisionCartItem) => item.id)));
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, price, stock_quantity, track_quantity, status, image_url')
    .in('id', productIds)
    .eq('merchant_id', input.merchantId);

  if (!products || products.length !== productIds.length) {
    throw new Error('One or more products are unavailable');
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const validatedCart = [];
  for (const item of cart) {
    const product = productMap.get(item.id);
    if (!product || (product.status && product.status !== 'active')) {
      throw new Error('One or more products are unavailable');
    }

    const quantity = Math.max(1, Math.floor(Number(item.quantity)));
    if ((product.track_quantity ?? true) && product.stock_quantity !== null && product.stock_quantity < quantity) {
      throw new Error(`${product.name} is out of stock`);
    }

    validatedCart.push({
      id: product.id,
      name: product.name,
      image_url: product.image_url,
      quantity,
      price: product.price,
    });
  }

  const subtotal = validatedCart.reduce((acc: number, item: { id: string; name: string; image_url: string | null; quantity: number; price: number }) => {
    const bargainedPrice = bargainedPrices?.[item.id];
    const itemPrice = bargainedPrice ? (typeof bargainedPrice === 'number' ? bargainedPrice : bargainedPrice.bargainedPrice) : item.price;
    return acc + itemPrice * item.quantity;
  }, 0);

  const shippingSettings = input.merchant?.shipping_settings ?? { zones: [] as ShippingZone[] };
  const customerCountry = customerInfo.country || 'US';
  let shipping = 0;
  const zones = shippingSettings.zones ?? [];
  if (zones.length > 0) {
    const matchingZone = zones.find((zone: ShippingZone) => zone.countries?.includes(customerCountry));
    if (matchingZone?.rates?.[0]) {
      shipping = matchingZone.rates[0].price;
    } else if (zones[0]?.rates?.[0]) {
      shipping = zones[0].rates[0].price;
    }
  } else {
    shipping = subtotal > 100 ? 0 : 15;
  }

  const taxSettings = input.merchant?.tax_settings || { enabled: false, default_rate: 0 };
  let tax = 0;
  let taxRate = 0;
  let taxName = 'Tax';
  if (taxSettings.enabled) {
    const countryRate = taxSettings.country_rates?.find((entry: TaxCountryRate) => entry.country_code === customerCountry);
    taxRate = countryRate?.rate || taxSettings.default_rate || 0;
    taxName = countryRate?.tax_name || 'Tax';
    if (taxRate > 0) {
      tax = subtotal * (taxRate / 100);
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const checkoutPath = `/store/${merchantSubdomain}/checkout`;
  const checkoutBaseUrl = input.merchant?.custom_domain && input.merchant?.domain_verified
    ? `https://${input.merchant.custom_domain}${checkoutPath}`
    : `${baseUrl}${checkoutPath}`;
  const bargainedItems = bargainedPrices
    ? Object.keys(bargainedPrices).map((id) => ({
        product_id: id,
        bargained_price: typeof bargainedPrices[id] === 'number' ? bargainedPrices[id] : bargainedPrices[id].bargainedPrice,
      }))
    : [];

  const checkout = await createStripeOrderCheckoutSession({
    merchant: input.merchant,
    subdomain: merchantSubdomain,
    customerInfo,
    validatedCart,
    paymentDetails: {
      bargained_items: bargainedItems.length > 0 ? bargainedItems : undefined,
    },
    shipping,
    tax,
    taxRate,
    taxName,
    source: 'ai_payment_link',
    successUrlBase: checkoutBaseUrl,
    cancelUrlBase: checkoutBaseUrl,
    reserveInventory: false,
    stripeSecretKeyOverride: secretKey,
    bargainedItems,
  });

  const newOutcome = { approved: true, reason: 'manual_approval', paymentUrl: checkout.session.url, orderId: checkout.order.id };
  await supabaseAdmin.from('ai_decision_log').update({ outcome: newOutcome }).eq('id', input.decisionLogId);

  if (input.decision.consumer_email && input.merchant) {
    await sendApprovalNotificationEmail({
      type: 'shipping',
      customerName: input.decision.consumer_email.split('@')[0],
      customerEmail: input.decision.consumer_email,
      storeName: input.merchant.store_name || 'Store',
      message: 'Your payment link is ready. Click below to complete your purchase.',
      actionUrl: checkout.session.url ?? undefined,
    }, input.merchant);
  }

  return newOutcome;
}

async function persistDecisionApprovalAudit(input: DecisionApprovalInput & {
  action: 'approve' | 'reverse'
  reason?: string | null
  originalOutcome: DecisionOutcome | undefined
  newOutcome: DecisionOutcome
}) {
  const overrideStatus = input.action === 'reverse' ? 'reversed' : 'approved';

  const { error: overrideError } = await supabaseAdmin
    .from('decision_overrides')
    .insert({
      decision_log_id: input.decisionLogId,
      merchant_id: input.merchantId,
      action: input.action,
      override_type: input.decision.decision_type || 'update',
      reason: input.reason || null,
      original_outcome: input.originalOutcome,
      new_outcome: input.newOutcome,
    });

  if (overrideError) {
    throw overrideError;
  }

  const { error: updateError } = await supabaseAdmin
    .from('ai_decision_log')
    .update({
      override_status: overrideStatus,
      override_reason: input.reason || null,
      overridden_at: new Date().toISOString(),
    })
    .eq('id', input.decisionLogId);

  if (updateError) {
    throw updateError;
  }

  await recordApprovalLifecycleEvent({
    merchantId: input.merchantId,
    kind: 'decision',
    domain: getDecisionApprovalDomain(String(input.decision.decision_type || '')),
    action: input.action,
    title: input.action === 'reverse' ? 'Decision rejected' : 'Decision approved',
    summary: input.action === 'reverse'
      ? 'Merchant declined an AI action that required approval.'
      : 'Merchant approved an AI action that required approval.',
    consumerEmail: input.decision.consumer_email || null,
    reason: input.reason || null,
    factors: {
      decisionLogId: input.decisionLogId,
      decisionType: input.decision.decision_type || null,
      policySummary: describeDecisionApprovalPolicy(input.merchant, input.decision).summary,
    },
    outcome: {
      overrideStatus,
      newOutcome: input.newOutcome,
    },
  });
}

export async function applyDecisionApprovalAction(input: {
  merchantId: string
  decisionLogId: string
  action: 'approve' | 'reverse'
  reason?: string | null
}) {
  const { data: decision } = await supabaseAdmin
    .from('ai_decision_log')
    .select('*')
    .eq('id', input.decisionLogId)
    .eq('merchant_id', input.merchantId)
    .single();

  if (!decision) {
    throw new Error('Decision not found');
  }

  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('subdomain, custom_domain, domain_verified, store_name, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, payment_methods, shipping_settings, tax_settings, currency, ai_max_discount_percentage, ai_refund_policy, ai_loyalty_policy, ai_shipping_policy')
    .eq('id', input.merchantId)
    .single();

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  // We fetch the policy description for audit purposes, but we don't block
  // the manual action if it's "not allowed" by the AI's current policy settings.
  // Manual overrides are always permitted as the ultimate merchant authority.
  const policy = describeDecisionApprovalPolicy(merchant, decision);

  let newOutcome: DecisionOutcome;
  if (input.action === 'reverse') {
    if (decision.consumer_email && merchant) {
      await sendApprovalNotificationEmail({
        type: getDecisionNotificationType(decision.decision_type) as 'refund' | 'loyalty' | 'discount' | 'shipping',
        customerName: decision.consumer_email.split('@')[0],
        customerEmail: decision.consumer_email,
        storeName: merchant.store_name || 'Store',
        message: 'Your request was reviewed and declined by the merchant.',
      }, merchant);
    }

    newOutcome = { reversed: true, original: decision.outcome };
  } else if (decision.decision_type === 'refund_rejected') {
    newOutcome = await approveRefundDecision({
      decision,
      merchant,
      merchantId: input.merchantId,
      decisionLogId: input.decisionLogId,
    });
  } else if (decision.decision_type === 'loyalty_reward') {
    newOutcome = await approveLoyaltyDecision({
      decision,
      merchant,
      merchantId: input.merchantId,
      decisionLogId: input.decisionLogId,
    });
  } else if (decision.decision_type === 'discount_rejected' && decision.outcome?.reason === 'requires_approval') {
    newOutcome = await approveDiscountDecision({
      decision,
      merchant,
      merchantId: input.merchantId,
      decisionLogId: input.decisionLogId,
    });
  } else if (decision.decision_type === 'shipping_selected' && decision.outcome?.reason === 'requires_approval') {
    newOutcome = await approveShippingDecision({
      decision,
      merchant,
      merchantId: input.merchantId,
      decisionLogId: input.decisionLogId,
    });
  } else {
    newOutcome = { approved: true };
  }

  await persistDecisionApprovalAudit({
    decision,
    merchant,
    merchantId: input.merchantId,
    decisionLogId: input.decisionLogId,
    action: input.action,
    reason: input.reason || null,
    originalOutcome: decision.outcome,
    newOutcome,
  });

  return { decision, merchant, newOutcome, policy };
}
