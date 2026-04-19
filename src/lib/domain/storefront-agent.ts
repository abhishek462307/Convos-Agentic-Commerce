import { semanticSearch } from '@/lib/embeddings';
import { PRODUCT_SELECT } from '@/lib/product-select';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createMerchantMissionFromGoal } from '@/lib/agentic/missions';
import { shouldStorefrontAgentAutoRefund } from '@/lib/agentic/storefront-refunds';
import { createMerchantDiscount } from '@/lib/domain/discounts';
import { logAIDecision } from '@/app/api/ai/azure-client';
import type { Merchant } from '@/types';

interface PriceFormatter {
  (price: number): string
}

interface StorefrontProduct {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  price: number;
  compare_at_price?: number;
  stock_quantity?: number;
  image_url?: string;
  badge?: string;
  bargain_enabled?: boolean;
  bargain_min_price?: number;
  is_veg?: boolean;
  status?: string;
  variants?: ProductVariant[];
  rating?: number | null;
  review_count?: number;
  review_summary?: string | null;
  popularity_reason?: string | null;
  [key: string]: unknown;
}

interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  stock_quantity?: number;
  options?: Record<string, unknown>;
  is_active?: boolean;
}

interface ProductReview {
  product_id: string;
  rating: number;
  title?: string;
  content?: string;
}

interface ConsumerProfile {
  trust_score?: number;
  [key: string]: unknown;
}

interface OrderRecord {
  id: string;
  customer_info?: Record<string, unknown>;
  total_amount?: number;
  status?: string;
  [key: string]: unknown;
}

interface RecommendationInput {
  merchantId: string
  basedOn?: string
  cart?: { name: string; id: string }[]
  formatPrice: PriceFormatter
}

interface BargainInput {
  merchant: Merchant
  productId: string
  bargainedPrice: number
  sessionId?: string
  consumerEmail?: string
  consumerProfile?: ConsumerProfile
  storeBargainEnabled: boolean
  formatPrice: PriceFormatter
}

interface RefundReviewInput {
  merchant: Merchant
  orderId: string
  email?: string
  consumerEmail?: string
  consumerProfile?: ConsumerProfile
  reason?: string
  sessionId?: string
  formatPrice: PriceFormatter
}

interface SupportMissionInput {
  merchant: Merchant
  email?: string
  consumerEmail?: string
  topic: string
  details: string
  orderId?: string
}

interface LoyaltyRewardInput {
  merchant: Merchant
  rewardType: string
  sessionId?: string
  consumerEmail?: string
  consumerProfile?: ConsumerProfile
}

async function attachVariantsToProducts(products: StorefrontProduct[]) {
  if (!products || products.length === 0) return [];

  const productIds = Array.from(new Set(products.map((product) => product.id).filter(Boolean)));
  if (productIds.length === 0) return products;

  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, product_id, name, price, stock_quantity, options, is_active')
    .in('product_id', productIds)
    .eq('is_active', true)
    .order('name', { ascending: true });

  const variantMap = new Map<string, ProductVariant[]>();
  for (const variant of variants || []) {
    const current = variantMap.get(variant.product_id) || [];
    current.push(variant);
    variantMap.set(variant.product_id, current);
  }

  return products.map((product) => ({
    ...product,
    variants: variantMap.get(product.id) || [],
  }));
}

async function attachCommerceSignalsToProducts(products: StorefrontProduct[]) {
  const withVariants = await attachVariantsToProducts(products);
  if (withVariants.length === 0) return withVariants;

  const productIds = withVariants.map((product) => product.id);
  const { data: reviews } = await supabase
    .from('product_reviews')
    .select('product_id,rating,title,content')
    .in('product_id', productIds)
    .eq('is_approved', true)
    .limit(200);

  const reviewMap = new Map<string, ProductReview[]>();
  for (const review of reviews || []) {
    const current = reviewMap.get(review.product_id) || [];
    current.push(review);
    reviewMap.set(review.product_id, current);
  }

  return withVariants.map((product) => {
    const productReviews = reviewMap.get(product.id) || [];
    const reviewCount = productReviews.length;
    const rating = reviewCount > 0
      ? Number((productReviews.reduce((acc, review) => acc + Number(review.rating || 0), 0) / reviewCount).toFixed(1))
      : null;
    const reviewSummary = productReviews[0]?.title || productReviews[0]?.content || null;
    const popularityReason =
      product.badge === 'Best Seller'
        ? 'best seller'
        : reviewCount >= 5
          ? `${reviewCount} shoppers reviewed it`
          : product.badge || null;

    return {
      ...product,
      rating,
      review_count: reviewCount,
      review_summary: reviewSummary,
      popularity_reason: popularityReason,
    };
  });
}

export function buildProductDecisionSupport(product: StorefrontProduct, input: {
  formatPrice: PriceFormatter
  query?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  inStockOnly?: boolean
  source?: 'search' | 'popular' | 'details'
}) {
  const highlights: string[] = [];
  const fitReasons: string[] = [];
  const query = (input.query || '').trim().toLowerCase();
  const name = (product.name || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const compareAt = Number(product.compare_at_price);
  const price = Number(product.price);
  const stock = Number(product.stock_quantity);

  if (input.category && category.includes(String(input.category).toLowerCase())) {
    fitReasons.push(`matches ${input.category}`);
  }

  if (query) {
    const terms = query.split(/\s+/).filter(Boolean);
    const matchedTerms = terms.filter((term) => name.includes(term) || description.includes(term) || category.includes(term));
    if (matchedTerms.length > 0) {
      fitReasons.push(matchedTerms.length >= 2 ? 'fits your search closely' : `relevant to "${matchedTerms[0]}"`);
    }
  }

  if (Number.isFinite(input.maxPrice) && price <= Number(input.maxPrice)) {
    fitReasons.push('within your budget');
  } else if (Number.isFinite(input.minPrice) && price >= Number(input.minPrice)) {
    fitReasons.push('in your target range');
  }

  if (product.badge) fitReasons.push(`${String(product.badge).toLowerCase()}`);
  if (product.review_count) fitReasons.push(`${product.review_count} reviews`);

  if (Number.isFinite(compareAt) && compareAt > price) {
    highlights.push(`${Math.round(((compareAt - price) / compareAt) * 100)}% off`);
  }
  if (product.bargain_enabled) highlights.push('bargainable');
  if (product.track_quantity) {
    if (stock <= 0) highlights.push('out of stock');
    else if (stock <= 5) highlights.push(`only ${stock} left`);
    else if (input.inStockOnly) highlights.push('in stock');
  }
  if (product.type === 'digital' || product.digital_file_url) highlights.push('digital');
  if (input.source === 'popular') highlights.push('fresh pick');
  if (product.rating && product.review_count) highlights.push(`${product.rating}/5 (${product.review_count})`);
  if (product.popularity_reason) highlights.push(String(product.popularity_reason));

  let tradeoff: string | undefined;
  if (Number.isFinite(compareAt) && compareAt > price) {
    tradeoff = `sale price ${input.formatPrice(price)} vs ${input.formatPrice(compareAt)} regular`;
  } else if (product.bargain_enabled && product.bargain_min_price) {
    tradeoff = `listed at ${input.formatPrice(price)} with room to negotiate`;
  } else if (Number.isFinite(stock) && stock > 0 && stock <= 5) {
    tradeoff = `limited stock at ${input.formatPrice(price)}`;
  }

  const aiReason = fitReasons[0]
    ? `${fitReasons[0]}${fitReasons[1] ? `, plus ${fitReasons[1]}` : ''}`
    : input.source === 'details'
      ? 'good fit based on the current product details'
      : 'worth considering';

  return {
    ...product,
    ai_reason: aiReason,
    ai_highlights: highlights.slice(0, 3),
    ai_tradeoff: tradeoff,
    popularity_reason: product.popularity_reason,
  };
}

export async function getStorefrontRecommendations(input: RecommendationInput) {
  let recommendations: StorefrontProduct[] = [];

  if (input.basedOn === 'cart' && input.cart && input.cart.length > 0) {
    const cartNames = input.cart.map((item) => item.name).join(', ');
    recommendations = await semanticSearch(`similar to ${cartNames}`, input.merchantId, { limit: 4 });
  } else if (input.basedOn) {
    recommendations = await semanticSearch(input.basedOn, input.merchantId, { limit: 4 });
  } else {
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('merchant_id', input.merchantId)
      .gt('stock_quantity', 0)
      .limit(4);
    recommendations = data || [];
  }

  const enrichedRecommendations = (await attachCommerceSignalsToProducts(recommendations)).map((product) =>
    buildProductDecisionSupport(product, {
      formatPrice: input.formatPrice,
      source: 'popular',
      inStockOnly: true,
    })
  );

  return enrichedRecommendations;
}

export async function getCustomerPurchaseSummary(merchantId: string, email: string) {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, created_at')
    .eq('merchant_id', merchantId)
    .contains('customer_info', { email });

  return {
    orderCount: orders?.length || 0,
    totalSpent: orders?.reduce((acc, order) => acc + Number(order.total_amount), 0) || 0,
    isLoyalCustomer: (orders?.length || 0) >= 2,
    globalProfile: { trust_score: 80, risk_level: 'low' },
  };
}

export async function getCustomerOrderStatus(merchantId: string, email: string, orderId?: string) {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('merchant_id', merchantId)
    .contains('customer_info', { email })
    .order('created_at', { ascending: false });

  return orderId ? orders?.find((order) => order.id === orderId) : orders?.[0];
}

export async function setStorefrontBargainedPrice(input: BargainInput) {
  if (!input.storeBargainEnabled) {
    return { success: false, error: 'Bargaining is not enabled for this store' };
  }

  if (!input.bargainedPrice || input.bargainedPrice <= 0 || !isFinite(input.bargainedPrice)) {
    return { success: false, error: 'Invalid price value' };
  }

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, name, price, bargain_enabled, bargain_min_price')
    .eq('id', input.productId)
    .single();

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  // Use merchant's global max discount as fallback if no product floor is set
  const merchantMaxDiscount = Number(input.merchant?.ai_max_discount_percentage ?? 25);
  const effectiveFloorPrice = product.bargain_min_price 
    ? Number(product.bargain_min_price)
    : Number(product.price) * (1 - merchantMaxDiscount / 100);

  const impliedDisountPct = ((Number(product.price) - input.bargainedPrice) / Number(product.price)) * 100;

  if (!product.bargain_enabled) {
    return { success: false, error: 'Bargaining not enabled for this specific product' };
  }

  if (input.bargainedPrice < effectiveFloorPrice) {
    return { success: false, error: `Price too low. Minimum is ${input.formatPrice(effectiveFloorPrice)}` };
  }
  if (input.bargainedPrice >= Number(product.price)) {
    return { success: false, error: 'Bargained price must be lower than original price' };
  }
  if (!input.sessionId) {
    return { success: false, error: 'Session ID required for bargaining' };
  }

  const { count: recentAttempts } = await supabaseAdmin
    .from('bargained_prices')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', input.sessionId)
    .eq('product_id', input.productId)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  if ((recentAttempts || 0) >= 5) {
    return { success: false, error: 'Too many bargain attempts for this product. Please try again later.' };
  }

  let isPreAuthorized = false;
  if (input.consumerEmail) {
    const { data: permissions } = await supabaseAdmin
      .from('agent_permissions')
      .select('*')
      .eq('consumer_email', input.consumerEmail)
      .single();

    isPreAuthorized = !!(
      permissions &&
      permissions.autonomy_level === 'autonomous' &&
      permissions.max_spend_limit >= input.bargainedPrice &&
      permissions.can_negotiate
    );
  }

  const discountPct = Math.round(((Number(product.price) - input.bargainedPrice) / Number(product.price)) * 100);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await supabaseAdmin
    .from('bargained_prices')
    .delete()
    .eq('session_id', input.sessionId)
    .eq('product_id', input.productId);

  const { error: insertError } = await supabaseAdmin
    .from('bargained_prices')
    .insert({
      merchant_id: input.merchant.id,
      product_id: input.productId,
      session_id: input.sessionId,
      original_price: product.price,
      bargained_price: input.bargainedPrice,
      discount_percentage: discountPct,
      status: 'active',
      expires_at: expiresAt,
    });

  if (insertError) {
    return { success: false, error: 'Failed to save bargained price' };
  }

  const bargainResult = {
    productId: input.productId,
    productName: product.name,
    originalPrice: product.price,
    bargainedPrice: input.bargainedPrice,
    discountPercentage: discountPct,
    expiresAt,
  };

  logAIDecision({
    merchantId: input.merchant.id,
    sessionId: input.sessionId,
    consumerEmail: input.consumerEmail,
    decisionType: 'discount_approved',
    summary: `Approved ${discountPct}% discount on ${product.name} — bargained from ${input.formatPrice(Number(product.price))} to ${input.formatPrice(input.bargainedPrice)}, above floor of ${input.formatPrice(Number(product.bargain_min_price))}`,
    factors: {
      trust_score: input.consumerProfile?.trust_score || 'unknown',
      original_price: product.price,
      bargained_price: input.bargainedPrice,
      floor_price: product.bargain_min_price,
      discount_pct: discountPct,
    },
    outcome: { price_set: input.bargainedPrice, added_to_cart: true },
    toolCalled: 'set_bargained_price',
  });

  supabaseAdmin.from('ai_events').insert({
    merchant_id: input.merchant.id,
    event_type: 'negotiation_completed',
    consumer_email: input.consumerEmail,
    session_id: input.sessionId,
    event_data: {
      product_id: input.productId,
      product_name: product.name,
      original_price: product.price,
      bargained_price: input.bargainedPrice,
      discount_pct: discountPct,
      revenue_delta: -(Number(product.price) - input.bargainedPrice),
    },
  }).then(() => {});

  return {
    success: true,
    message: `Bargained price set: ${input.formatPrice(input.bargainedPrice)} (${discountPct}% off)${isPreAuthorized ? ' — Pre-authorized within budget!' : ''}`,
    pre_authorized: isPreAuthorized,
    bargainResult,
    cartAction: { type: 'set_bargained_price', ...bargainResult },
  };
}

function getOrderCustomerEmail(order: OrderRecord) {
  const customerInfo = order?.customer_info;
  if (customerInfo && typeof customerInfo === 'object' && !Array.isArray(customerInfo)) {
    return String(customerInfo.email || '').toLowerCase();
  }

  return '';
}

export async function createStorefrontRefundReview(input: RefundReviewInput) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', input.orderId)
    .eq('merchant_id', input.merchant.id)
    .single();

  if (!order) {
    return { success: false, error: 'Order not found', skip: true };
  }

  const customerEmail = String(input.email || input.consumerEmail || '').toLowerCase();
  if (!customerEmail || getOrderCustomerEmail(order) !== customerEmail) {
    return {
      success: false,
      error: 'I can only help with refunds for the authenticated customer who placed the order.',
      skip: true,
    };
  }

  const trustScore = input.consumerProfile?.trust_score || 80;
  const refundPolicy = input.merchant.ai_refund_policy || 'approval_required';
  const refundMaxAmount = Number(input.merchant.ai_max_refund_amount) || 0;
  const canAutoApprove = shouldStorefrontAgentAutoRefund({
    merchantRefundPolicy: refundPolicy,
    trustScore,
    refundMaxAmount,
    orderAmount: Number(order.total_amount),
  });

  const { data: existingRefund } = await supabaseAdmin
    .from('refunds')
    .select('id, status')
    .eq('order_id', input.orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let refundError: unknown = null;
  if (!existingRefund || !['pending', 'approved'].includes(String(existingRefund.status || ''))) {
    const refundInsert = await supabaseAdmin.from('refunds').insert({
      order_id: input.orderId,
      merchant_id: input.merchant.id,
      reason: input.reason,
      status: 'pending',
      amount: order.total_amount,
    });
    refundError = refundInsert.error;
  }

  const mission = await createMerchantMissionFromGoal(
    input.merchant,
    'support_triage',
    `Handle refund request for order ${String(input.orderId).slice(0, 8)}`,
    {
      origin: 'storefront_agent',
      actor: 'agent',
      consumerEmail: customerEmail,
      forceApproval: true,
      extraConstraints: {
        order_id: input.orderId,
        request_type: 'refund',
        refund_reason: input.reason,
        customer_email: customerEmail,
      },
    }
  );

  logAIDecision({
    merchantId: input.merchant.id,
    sessionId: input.sessionId,
    consumerEmail: input.consumerEmail,
    orderId: input.orderId,
    decisionType: 'refund_rejected',
    summary: `Flagged refund request for review — trust score ${trustScore}, policy: ${refundPolicy}${refundPolicy === 'autonomous' && order.total_amount > refundMaxAmount ? `, amount exceeds max ${input.formatPrice(refundMaxAmount)}` : ''}`,
    factors: {
      trust_score: trustScore,
      refund_policy: refundPolicy,
      refund_max_amount: refundMaxAmount,
      order_amount: order.total_amount,
      reason: input.reason,
      storefront_auto_refund_allowed: canAutoApprove,
    },
    outcome: { status: 'pending', reason: 'requires_approval', mission_id: mission.mission.id },
    toolCalled: 'request_refund_or_return',
  });

  return {
    success: !refundError,
    status: 'pending',
    missionId: mission.mission.id,
    message: refundPolicy === 'disabled'
      ? 'Refunds are handled by support for this store. I’ve opened a support workflow for the merchant team.'
      : 'I’ve opened a refund workflow for the merchant team and they’ll review it shortly.',
  };
}

export async function createStorefrontSupportRequest(input: SupportMissionInput) {
  const customerEmail = String(input.email || input.consumerEmail || '').toLowerCase();
  if (!customerEmail) {
    return {
      success: false,
      error: 'Customer email is required for support requests.',
      skip: true,
    };
  }

  const mission = await createMerchantMissionFromGoal(
    input.merchant,
    'support_triage',
    `${input.topic}: ${input.details}`.slice(0, 180),
    {
      origin: 'storefront_agent',
      actor: 'agent',
      consumerEmail: customerEmail,
      forceApproval: true,
      extraConstraints: {
        order_id: input.orderId || null,
        request_type: 'support',
        topic: input.topic,
        details: input.details,
        customer_email: customerEmail,
      },
    }
  );


  return {
    success: true,
    missionId: mission.mission.id,
    message: 'I’ve created a support request for the merchant team and attached the details from this conversation.',
  };
}

export async function applyStorefrontLoyaltyReward(input: LoyaltyRewardInput) {
  const trustScore = input.consumerProfile?.trust_score || 80;
  const loyaltyPolicy = input.merchant.ai_loyalty_policy || 'autonomous';

  if (loyaltyPolicy === 'disabled') {
    logAIDecision({
      merchantId: input.merchant.id,
      sessionId: input.sessionId,
      consumerEmail: input.consumerEmail,
      decisionType: 'loyalty_reward',
      summary: 'Loyalty reward blocked — policy is disabled',
      factors: { trust_score: trustScore, loyalty_policy: loyaltyPolicy, reward_type: input.rewardType },
      outcome: { granted: false, reason: 'policy_disabled' },
      toolCalled: 'apply_loyalty_reward',
    });

    return { success: false, message: 'Loyalty rewards are not enabled for this store.' };
  }

  let discountCode: string | null = null;

  if (input.rewardType === 'discount' && trustScore >= 85 && loyaltyPolicy === 'autonomous') {
    discountCode = `LOYALTY${Math.floor(1000 + Math.random() * 9000)}`;
    await createMerchantDiscount({
      merchantId: input.merchant.id,
      actorType: 'agent',
      code: discountCode,
      type: 'percentage',
      value: 15,
      usageLimit: 1,
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      context: {
        source: 'storefront_agent',
        trustScore,
        rewardType: input.rewardType,
      },
    });

    logAIDecision({
      merchantId: input.merchant.id,
      sessionId: input.sessionId,
      consumerEmail: input.consumerEmail,
      decisionType: 'loyalty_reward',
      summary: `Granted 15% loyalty discount (${discountCode}) to ${input.consumerEmail || 'customer'} — trust score ${trustScore}, policy: autonomous`,
      factors: { trust_score: trustScore, loyalty_policy: loyaltyPolicy, reward_type: input.rewardType },
      outcome: { granted: true, code: discountCode, discount: '15%' },
      toolCalled: 'apply_loyalty_reward',
    });
  } else if (loyaltyPolicy === 'approval_required') {
    logAIDecision({
      merchantId: input.merchant.id,
      sessionId: input.sessionId,
      consumerEmail: input.consumerEmail,
      decisionType: 'loyalty_reward',
      summary: `Loyalty reward flagged for approval — trust score ${trustScore}, policy: approval_required`,
      factors: { trust_score: trustScore, loyalty_policy: loyaltyPolicy, reward_type: input.rewardType },
      outcome: { granted: false, reason: 'requires_approval' },
      toolCalled: 'apply_loyalty_reward',
    });
  }

  return {
    success: !!discountCode || input.rewardType !== 'discount',
    reward: discountCode ? { code: discountCode, type: '15% discount' } : input.rewardType,
    message: discountCode
      ? `As a valued customer, I've unlocked a secret 15% discount for you: ${discountCode}`
      : loyaltyPolicy === 'approval_required'
        ? 'I\'ve submitted a loyalty reward request for you. The merchant will review it shortly.'
        : 'Loyalty reward processed.',
  };
}
