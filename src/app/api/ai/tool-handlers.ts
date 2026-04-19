import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logAIDecision } from './azure-client';
import { semanticSearch } from '@/lib/embeddings';
import { PRODUCT_SELECT } from '@/lib/product-select';
import logger from '@/lib/logger';
import { createStripeOrderCheckoutSession } from '@/lib/domain/stripe-checkout';
import type { Merchant } from '@/types';
import {
  applyStorefrontLoyaltyReward,
  createStorefrontRefundReview,
  createStorefrontSupportRequest,
  getCustomerOrderStatus,
  getCustomerPurchaseSummary,
  getStorefrontRecommendations,
  setStorefrontBargainedPrice,
} from '@/lib/domain/storefront-agent';

interface ToolProduct {
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
  track_quantity?: boolean;
  type?: string;
  digital_file_url?: string;
  status?: string;
  variants?: ToolVariant[];
  rating?: number | null;
  review_count?: number;
  review_summary?: string | null;
  popularity_reason?: string | null;
  ai_reason?: string;
  ai_highlights?: string[];
  ai_tradeoff?: string;
  [key: string]: unknown;
}

interface ToolVariant {
  id: string;
  product_id: string;
  name?: string;
  price: number;
  stock_quantity?: number | null;
  options?: Record<string, unknown>;
  is_active?: boolean;
}

interface ToolCartItem {
  id: string;
  name?: string;
  price: number;
  quantity: number;
  image_url?: string;
  variant?: { id?: string; name?: string };
  variantName?: string;
}

interface ToolBargainEntry {
  product_id: string;
  original_price: number;
  bargained_price: number;
  discount_percentage?: number;
}

interface ToolReview {
  product_id: string;
  rating: number;
  title?: string;
  content?: string;
}

interface ToolShippingZone {
  countries?: string[];
  rates?: { price: number }[];
}

interface ToolTaxCountryRate {
  country_code: string;
  rate: number;
  tax_name?: string;
}

interface ToolShippingSettings {
  zones?: ToolShippingZone[];
  carriers?: Record<string, unknown>;
}

interface ToolTaxSettings {
  enabled?: boolean;
  default_rate?: number;
  country_rates?: ToolTaxCountryRate[];
}

interface ToolConsumerProfile {
  trust_score?: number;
  last_address?: Record<string, string>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ToolStripeConfig {
  enabled?: boolean;
  test_mode?: boolean;
  test_secret_key?: string;
  secret_key?: string;
}

interface ToolMessage {
  role: string;
  tool_call_id: string;
  name: string;
  content: string;
}

export interface ToolHandlerContext {
  merchant: Merchant;
  sessionId: string;
  subdomain: string;
  cart: ToolCartItem[];
  userEmail?: string;
  consumerEmail?: string;
  consumerProfile: ToolConsumerProfile;
  activeBargains: ToolBargainEntry[];
  storeBargainEnabled: boolean;
  products: ToolProduct[];
  cartActions: Record<string, unknown>[];
  layoutResult: { sections: Record<string, unknown>[] } | null;
  couponResult: Record<string, unknown> | null;
  bargainResult: Record<string, unknown> | null;
  suggestionButtons: Array<string | { label: string; action: string }>;
  comparisonResult?: Record<string, unknown>;
  checkoutConfidence?: Record<string, unknown>;
  activePreferences?: Record<string, unknown>[];
  refinementOptions?: Array<{ label: string; action: string; type?: string }>;
  activeFilters?: Array<{ key: string; label: string; value: string }>;
  variantPrompt?: Record<string, unknown>;
  recoveryState?: Record<string, unknown>;
  lastStableResultId?: string;
  isComplexGoal?: boolean;
}

export async function handleToolCall(
  funcName: string,
  args: Record<string, any>,
  toolCallId: string,
  ctx: ToolHandlerContext
): Promise<{ toolMessage: ToolMessage; skip?: boolean }> {
  const {
    merchant, sessionId, subdomain, cart, userEmail,
    consumerEmail, consumerProfile, activeBargains, storeBargainEnabled
  } = ctx;

  const currency = merchant.currency || 'USD';
  const locale = merchant.locale || 'en-US';
  const formatPrice = (price: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(price);

  const makeToolMsg = (name: string, content: unknown) => ({
    role: 'tool',
    tool_call_id: toolCallId,
    name,
    content: JSON.stringify(content)
  });

  const attachVariantsToProducts = async (products: ToolProduct[]) => {
    if (!products || products.length === 0) return [];
    const productIds = Array.from(new Set(products.map((product) => product.id).filter(Boolean)));
    if (productIds.length === 0) return products;

    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, product_id, name, price, stock_quantity, options, is_active')
      .in('product_id', productIds)
      .eq('is_active', true)
      .order('name', { ascending: true });

    const variantMap = new Map<string, ToolVariant[]>();
    for (const variant of variants || []) {
      const current = variantMap.get(variant.product_id) || [];
      current.push(variant);
      variantMap.set(variant.product_id, current);
    }

    return products.map((product) => ({
      ...product,
      variants: variantMap.get(product.id) || [],
    }));
  };

  const findVariantMatchedProductIds = async (sizeNeedle?: string, colorNeedle?: string) => {
    const normalizedSize = String(sizeNeedle || '').toLowerCase().trim();
    const normalizedColor = String(colorNeedle || '').toLowerCase().trim();
    if (!normalizedSize && !normalizedColor) return null;

    const { data: variantRows } = await supabase
      .from('product_variants')
      .select('product_id, name, options, products!inner(merchant_id)')
      .eq('products.merchant_id', merchant.id)
      .eq('is_active', true);

    const matchedProductIds = new Set<string>();
    for (const variant of variantRows || []) {
      const haystack = JSON.stringify([variant.name, variant.options]).toLowerCase();
      const matchesSize = !normalizedSize || haystack.includes(normalizedSize);
      const matchesColor = !normalizedColor || haystack.includes(normalizedColor);
      if (matchesSize && matchesColor && variant.product_id) {
        matchedProductIds.add(variant.product_id);
      }
    }

    return Array.from(matchedProductIds);
  };

  const buildVariantChoiceButtons = (variants: ToolVariant[] = []) =>
    variants.slice(0, 6).map((variant) => ({
      label: variant.name || [variant.options?.size, variant.options?.color].filter(Boolean).join(' / ') || 'Default',
      action: variant.id
    }));

  const buildRefinementOptions = (products: ToolProduct[], filters?: Record<string, unknown>) => {
    const options: Array<{ label: string; action: string; type?: string }> = [];
    const categories = Array.from(new Set(products.map((product) => product.category).filter(Boolean))).slice(0, 3);
    const budgetProducts = products.filter((product) => Number.isFinite(Number(product.price)));
    const sortedPrices = budgetProducts.map((product) => Number(product.price)).sort((a, b) => a - b);

    if (!filters?.dealsOnly) options.push({ label: 'show deals only', action: 'show deals only', type: 'deal' });
    if (!filters?.inStockOnly) options.push({ label: 'in stock only', action: 'show in stock only', type: 'stock' });
    if (sortedPrices.length > 0) {
      options.push({ label: `under ${formatPrice(sortedPrices[Math.max(0, Math.floor(sortedPrices.length / 2) - 1)] || sortedPrices[0])}`, action: `show me options under ${Math.ceil(sortedPrices[Math.max(0, Math.floor(sortedPrices.length / 2) - 1)] || sortedPrices[0])}`, type: 'budget' });
    }
    categories.forEach((category) => {
      options.push({ label: String(category), action: `show me ${String(category).toLowerCase()}`, type: 'category' });
    });

    const variantTerms = Array.from(new Set(products.flatMap((product) => (product.variants || []).map((variant: ToolVariant) => variant.name).filter(Boolean)))).slice(0, 2);
    variantTerms.forEach((term) => {
      options.push({ label: String(term), action: `show ${String(term).toLowerCase()}`, type: 'size' });
    });

    return options.slice(0, 6);
  };

  const buildRecoveryState = (type: 'retry' | 'browse' | 'callback' | 'resume_results' | 'resume_checkout', message: string, actions?: Array<string | { label: string; action: string }>) => ({
    type,
    message,
    actions: actions || [
      { label: 'try again', action: '__retry__' },
      { label: 'browse store', action: '__browse__' },
    ]
  });

  const summarizeRefundPolicy = () => {
    const refundPolicy = merchant.ai_refund_policy || 'approval_required';
    const refundMaxAmount = Number(merchant.ai_max_refund_amount) || 0;
    if (refundPolicy === 'disabled') return 'returns go through support review';
    if (refundPolicy === 'autonomous') {
      return refundMaxAmount > 0
        ? `eligible refunds can be auto-approved up to ${formatPrice(refundMaxAmount)}`
        : 'eligible refunds can be auto-approved';
    }
    return 'returns may need merchant review';
  };

  const getEnabledPaymentMethods = (paymentMethods: Record<string, unknown>) => {
    const enabled = Object.entries(paymentMethods || {})
      .filter(([, value]) => !!(value as Record<string, unknown>)?.enabled)
      .map(([key]) => key.toUpperCase());
    return enabled.length > 0 ? enabled : ['COD'];
  };

  const computeCheckoutConfidence = async (input?: { customerInfo?: Record<string, string>; couponCode?: string }) => {
    const { data: merchantWithPayments } = await supabase
      .from('merchants')
      .select('payment_methods, shipping_settings, tax_settings')
      .eq('id', merchant.id)
      .single();

    const activeCart = Array.isArray(cart) ? cart : [];
    const customerCountry = input?.customerInfo?.country || consumerProfile?.last_address?.country || 'US';
    const cartBargainedPrices = activeBargains || [];

    const subtotal = activeCart.reduce((acc: number, item: ToolCartItem) => {
      const bargain = cartBargainedPrices.find((entry) => entry.product_id === item.id);
      const itemPrice = bargain ? bargain.bargained_price : item.price;
      return acc + (itemPrice * item.quantity);
    }, 0);

    const shippingSettings = (merchantWithPayments?.shipping_settings || { zones: [] }) as ToolShippingSettings;
    let estimatedShipping = 0;
    if (shippingSettings.zones && shippingSettings.zones.length > 0) {
      const matchingZone = shippingSettings.zones.find((zone) => zone.countries?.includes(customerCountry));
      if (matchingZone?.rates?.[0]) estimatedShipping = Number(matchingZone.rates[0].price) || 0;
      else if (shippingSettings.zones[0]?.rates?.[0]) estimatedShipping = Number(shippingSettings.zones[0].rates[0].price) || 0;
    } else {
      estimatedShipping = subtotal > 100 ? 0 : 15;
    }

    const taxSettings = (merchantWithPayments?.tax_settings || { enabled: false, default_rate: 0 }) as ToolTaxSettings;
    let estimatedTax = 0;
    if (taxSettings.enabled) {
      const countryRate = taxSettings.country_rates?.find((entry) => entry.country_code === customerCountry);
      const taxRate = Number(countryRate?.rate || taxSettings.default_rate || 0);
      if (taxRate > 0) estimatedTax = subtotal * (taxRate / 100);
    }

    let couponImpact = 0;
    if (ctx.couponResult?.code && !input?.couponCode) {
      const discountableAmount = ctx.couponResult.excludeBargainedItems
        ? activeCart.reduce((acc: number, item: ToolCartItem) => {
            const bargain = cartBargainedPrices.find((entry) => entry.product_id === item.id);
            if (bargain) return acc;
            return acc + (Number(item.price) * item.quantity);
          }, 0)
        : subtotal;
      couponImpact = ctx.couponResult.discountType === 'percentage'
        ? discountableAmount * (Number(ctx.couponResult.discountValue || 0) / 100)
        : Math.min(Number(ctx.couponResult.discountValue || 0), discountableAmount);
    } else if (input?.couponCode) {
      const { data: coupon } = await supabase
        .from('discounts')
        .select('code,type,value,min_order_amount,usage_limit,used_count,starts_at,ends_at')
        .eq('merchant_id', merchant.id)
        .eq('code', input.couponCode.toUpperCase())
        .limit(1);
      const foundCoupon = coupon?.[0];
      if (foundCoupon && (!foundCoupon.min_order_amount || subtotal >= foundCoupon.min_order_amount)) {
        couponImpact = foundCoupon.type === 'percentage'
          ? subtotal * (Number(foundCoupon.value) / 100)
          : Math.min(Number(foundCoupon.value), subtotal);
      }
    }

    const bargainSavings = activeCart.reduce((acc: number, item: ToolCartItem) => {
      const bargain = cartBargainedPrices.find((entry) => entry.product_id === item.id);
      return bargain ? acc + ((item.price - bargain.bargained_price) * item.quantity) : acc;
    }, 0);

    const confidence = {
      subtotal,
      estimatedShipping,
      estimatedTax,
      estimatedTotal: Math.max(0, subtotal + estimatedShipping + estimatedTax - couponImpact),
      paymentMethods: getEnabledPaymentMethods(merchantWithPayments?.payment_methods || merchant.payment_methods),
      returnSummary: summarizeRefundPolicy(),
      assumptions: [
        `shipping estimated for ${customerCountry}`,
        estimatedShipping === 0 ? 'shipping may be free based on subtotal or merchant rules' : 'shipping may change after final address confirmation',
        estimatedTax > 0 ? 'tax estimated from merchant settings' : 'tax not currently applied'
      ],
      bargainSavings,
      couponImpact,
      currency
    };
    ctx.checkoutConfidence = confidence;
    return confidence;
  };

  const attachCommerceSignalsToProducts = async (products: ToolProduct[]) => {
    const withVariants = await attachVariantsToProducts(products);
    if (withVariants.length === 0) return withVariants;

    const productIds = withVariants.map((product) => product.id);
    const { data: reviews } = await supabase
      .from('product_reviews')
      .select('product_id,rating,title,content')
      .in('product_id', productIds)
      .eq('is_approved', true)
      .limit(200);

    const reviewMap = new Map<string, ToolReview[]>();
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
  };

  const buildDecisionSupport = (product: ToolProduct, input: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStockOnly?: boolean;
    source?: 'search' | 'popular' | 'details';
  }) => {
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
        fitReasons.push(matchedTerms.length >= 2 ? `fits your search closely` : `relevant to "${matchedTerms[0]}"`);
      }
    }
    if (Number.isFinite(input.maxPrice) && price <= Number(input.maxPrice)) {
      fitReasons.push(`within your budget`);
    } else if (Number.isFinite(input.minPrice) && price >= Number(input.minPrice)) {
      fitReasons.push(`in your target range`);
    }
    if (product.badge) {
      fitReasons.push(`${String(product.badge).toLowerCase()}`);
    }
    if (product.review_count) {
      fitReasons.push(`${product.review_count} reviews`);
    }

    if (Number.isFinite(compareAt) && compareAt > price) {
      highlights.push(`${Math.round(((compareAt - price) / compareAt) * 100)}% off`);
    }
    if (product.track_quantity) {
      if (stock <= 0) highlights.push('out of stock');
      else if (stock <= 5) highlights.push(`only ${stock} left`);
      else if (input.inStockOnly) highlights.push('in stock');
    }
    if (product.type === 'digital' || product.digital_file_url) {
      highlights.push('digital');
    }
    if (input.source === 'popular') {
      highlights.push('fresh pick');
    }
    if (product.rating && product.review_count) {
      highlights.push(`${product.rating}/5 (${product.review_count})`);
    }
    if (product.popularity_reason) {
      highlights.push(String(product.popularity_reason));
    }

    let tradeoff: string | undefined;
    if (Number.isFinite(compareAt) && compareAt > price) {
      tradeoff = `sale price ${formatPrice(price)} vs ${formatPrice(compareAt)} regular`;
    } else if (Number.isFinite(stock) && stock > 0 && stock <= 5) {
      tradeoff = `limited stock at ${formatPrice(price)}`;
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
  };

  const summarizeProductForAI = (product: ToolProduct) => {
    const highlights: string[] = [];
    if (product.category) highlights.push(`category: ${product.category}`);
    if (product.description) highlights.push(`description: ${String(product.description).replace(/\s+/g, ' ').slice(0, 280)}`);
    if (product.badge) highlights.push(`badge: ${product.badge}`);
    if (product.compare_at_price && Number(product.compare_at_price) > Number(product.price)) {
      highlights.push(`sale: ${formatPrice(product.price)} from ${formatPrice(product.compare_at_price)}`);
    } else if (product.price !== undefined && product.price !== null) {
      highlights.push(`price: ${formatPrice(product.price)}`);
    }
    if (product.track_quantity) {
      highlights.push(
        (product.stock_quantity ?? 0) > 0
          ? `stock: ${product.stock_quantity} available`
          : 'stock: out of stock'
      );
    }
    if (product.type) highlights.push(`type: ${product.type}`);
    return {
      id: product.id,
      name: product.name,
      summary: highlights.join(' | '),
      ai_reason: product.ai_reason,
      ai_tradeoff: product.ai_tradeoff,
      rating: product.rating,
      review_count: product.review_count,
      review_summary: product.review_summary,
      popularity_reason: product.popularity_reason
    };
  };

  if (funcName === 'suggest_bundle') {
    const { data: bundleProducts } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .in('id', args.productIds);

    if (bundleProducts && bundleProducts.length > 0) {
      if (!ctx.layoutResult) ctx.layoutResult = { sections: [] as Record<string, unknown>[] };
      (ctx.layoutResult.sections as Record<string, unknown>[]).push({
        type: 'product_bundle',
        title: args.bundleName,
        description: args.description,
        products: bundleProducts,
        discountPercentage: args.discountPercentage
      });
      bundleProducts.forEach(p => {
        if (!ctx.products.find(existing => existing.id === p.id)) ctx.products.push(p);
      });
    }
    return { toolMessage: makeToolMsg('suggest_bundle', { success: true, bundleName: args.bundleName, productCount: bundleProducts?.length || 0 }) };
  }

  if (funcName === 'search_products') {
      const queryTerm = (args.query || '').trim().toLowerCase();
      const queryWords = queryTerm.split(/\s+/).filter(Boolean);
      const sizeNeedle = String(args.size || '').toLowerCase().trim();
      const colorNeedle = String(args.color || '').toLowerCase().trim();
      const genericTerms = new Set(['all', 'everything', 'anything', 'products', 'product', 'store', 'shop', 'show', 'browse', 'catalog', 'me', 'what', 'do', 'you', 'have', 'available']);
      const nonSearchTerms = new Set([
        ...genericTerms,
        'under', 'below', 'over', 'above', 'between', 'around', 'about', 'near',
        'within', 'budget', 'price', 'priced', 'cost', 'costing', 'cheap', 'cheaper',
        'affordable', 'range', 'rupees', 'rs', 'inr', 'usd', 'dollar', 'dollars'
      ]);
      const genericPhrases = [
        'show me all',
        'show me everything',
        'show all products',
        'show all items',
        'what do you have',
        'browse products',
        'browse catalog',
      ];
      const isGeneric =
        !args.category &&
        args.minPrice === undefined &&
        args.maxPrice === undefined &&
        !args.inStockOnly &&
        (
          genericPhrases.some(phrase => queryTerm.includes(phrase)) ||
          (queryWords.length > 0 && queryWords.every((word: string) => genericTerms.has(word)))
        );
      const meaningfulQueryWords = queryWords.filter(
        (word: string) => !nonSearchTerms.has(word) && !/^\d+([.,]\d+)?$/.test(word)
      );

      let foundProducts: ToolProduct[];
      const matchedVariantProductIds = await findVariantMatchedProductIds(sizeNeedle, colorNeedle);

        if (!args.query || !args.query.trim() || isGeneric) {
          let query = supabase.from('products').select(PRODUCT_SELECT).eq('merchant_id', merchant.id);
          if (args.category && args.category.trim()) query = query.ilike('category', `%${args.category}%`);
          if (args.minPrice !== undefined) query = query.gte('price', args.minPrice);
          if (args.maxPrice !== undefined) query = query.lte('price', args.maxPrice);
          if (args.inStockOnly) query = query.gt('stock_quantity', 0);
          if (args.bargainOnly) query = query.eq('bargain_enabled', true);
          if (args.dealsOnly) query = query.not('compare_at_price', 'is', null);
          if (matchedVariantProductIds) {
            if (matchedVariantProductIds.length === 0) {
              foundProducts = [];
            } else {
              query = query.in('id', matchedVariantProductIds);
            }
          }
          
          if (!matchedVariantProductIds || matchedVariantProductIds.length > 0) {
            if (meaningfulQueryWords.length > 0) {
              const conditions = meaningfulQueryWords.flatMap((word: string) => [
                `name.ilike.%${word}%`,
                `description.ilike.%${word}%`,
                `category.ilike.%${word}%`
              ]);
              query = query.or(conditions.join(','));
            }
            if (args.maxPrice !== undefined && args.minPrice === undefined) {
              query = query.order('price', { ascending: true });
            } else if (args.minPrice !== undefined && args.maxPrice === undefined) {
              query = query.order('price', { ascending: false });
            }
            const { data } = await query.limit(40); // Increased limit for generic/filtered browsing
            foundProducts = data || [];
          } else {
            foundProducts = [];
          }
        } else {
          // Comprehensive search using both Vector Embeddings and Lexical TSQuery
          foundProducts = await semanticSearch(args.query, merchant.id, {
            category: args.category,
            minPrice: args.minPrice,
            maxPrice: args.maxPrice,
            inStockOnly: args.inStockOnly,
            dealsOnly: args.dealsOnly,
            bargainOnly: args.bargainOnly,
            productIds: matchedVariantProductIds || undefined,
            limit: 40 // Increased limit for AI to have more context
          });
        }

      const productsWithSignals = await attachCommerceSignalsToProducts(foundProducts);
      const filteredProducts = productsWithSignals.filter((product) => {
        const matchesSize = !sizeNeedle || (product.variants || []).some((variant: ToolVariant) => JSON.stringify(variant.options || variant.name || '').toLowerCase().includes(sizeNeedle));
        const matchesColor = !colorNeedle || (product.variants || []).some((variant: ToolVariant) => JSON.stringify(variant.options || variant.name || '').toLowerCase().includes(colorNeedle));
        const matchesDeals = !args.dealsOnly || (Number(product.compare_at_price) > Number(product.price));
        const matchesBargain = !args.bargainOnly || !!product.bargain_enabled;
        return matchesSize && matchesColor && matchesDeals && matchesBargain;
      });

      const enrichedProducts = filteredProducts.map((product) => buildDecisionSupport(product, {
        query: args.query,
        category: args.category,
        minPrice: args.minPrice,
        maxPrice: args.maxPrice,
        inStockOnly: args.inStockOnly,
        source: 'search'
      }));

      ctx.activeFilters = [
        args.category ? { key: 'category', label: 'category', value: String(args.category) } : null,
        args.maxPrice !== undefined ? { key: 'maxPrice', label: 'budget', value: `under ${formatPrice(args.maxPrice)}` } : null,
        args.size ? { key: 'size', label: 'size', value: String(args.size) } : null,
        args.color ? { key: 'color', label: 'color', value: String(args.color) } : null,
        args.inStockOnly ? { key: 'stock', label: 'stock', value: 'in stock only' } : null,
        args.dealsOnly ? { key: 'deal', label: 'offers', value: 'deals only' } : null,
        args.bargainOnly ? { key: 'deal-type', label: 'deal type', value: 'special offers only' } : null,
      ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;
      ctx.refinementOptions = buildRefinementOptions(enrichedProducts, args);
      ctx.lastStableResultId = `search:${Date.now()}`;

      enrichedProducts.forEach(p => {
        if (!ctx.products.find(existing => existing.id === p.id)) ctx.products.push(p);
      });
      return {
        toolMessage: makeToolMsg('search_products', {
          found: enrichedProducts.length,
          filters: {
            query: args.query || null,
            category: args.category || null,
            minPrice: args.minPrice ?? null,
            maxPrice: args.maxPrice ?? null,
            inStockOnly: !!args.inStockOnly,
            size: args.size || null,
            color: args.color || null,
            urgency: args.urgency || null,
            dealsOnly: !!args.dealsOnly,
            bargainOnly: !!args.bargainOnly
          },
          product_briefs: enrichedProducts.map(summarizeProductForAI),
          products: enrichedProducts
        })
      };
    }

  if (funcName === 'get_popular_products') {
    let popQuery = supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('merchant_id', merchant.id)
      .gt('stock_quantity', 0);

    if (args.category) popQuery = popQuery.ilike('category', `%${args.category}%`);
    const limit = Math.min(args.limit || 8, 20);
    const { data: popularProducts } = await popQuery.order('created_at', { ascending: false }).limit(limit);

    const popularProductsWithSignals = await attachCommerceSignalsToProducts(popularProducts || []);
    const enrichedPopularProducts = popularProductsWithSignals.map((product) => buildDecisionSupport(product, {
      category: args.category,
      inStockOnly: true,
      source: 'popular'
    }));

    if (enrichedPopularProducts) {
      enrichedPopularProducts.forEach(p => {
        if (!ctx.products.find(existing => existing.id === p.id)) ctx.products.push(p);
      });
    }
    return {
      toolMessage: makeToolMsg('get_popular_products', {
        found: enrichedPopularProducts?.length || 0,
        product_briefs: enrichedPopularProducts.map(summarizeProductForAI),
        products: enrichedPopularProducts
      })
    };
  }

  if (funcName === 'get_bargain_products') {
    let bargainQuery = supabase
      .from('products')
      .select('id, name, price, category, bargain_enabled, bargain_min_price')
      .eq('merchant_id', merchant.id)
      .eq('bargain_enabled', true)
      .gt('stock_quantity', 0)
      .not('bargain_min_price', 'is', null);

    if (args.productId) bargainQuery = bargainQuery.eq('id', args.productId);
    const { data: bargainProds } = await bargainQuery.limit(50);

    const bargainData = (bargainProds || []).map(p => ({
      id: p.id, name: p.name, price: p.price, category: p.category,
      min_price: p.bargain_min_price,
      max_discount_pct: Math.round(((p.price - p.bargain_min_price) / p.price) * 100)
    }));
    return { toolMessage: makeToolMsg('get_bargain_products', bargainData) };
  }

  if (funcName === 'get_product_details') {
    const { data: productDetails } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', args.productId)
      .eq('merchant_id', merchant.id)
      .single();

    const [productWithSignals] = productDetails ? await attachCommerceSignalsToProducts([productDetails]) : [];
    const enrichedProductDetails = productWithSignals
      ? buildDecisionSupport(productWithSignals, { source: 'details' })
      : null;

    if (enrichedProductDetails && !ctx.products.find(p => p.id === enrichedProductDetails.id)) {
      ctx.products.push(enrichedProductDetails);
    }
    return {
      toolMessage: makeToolMsg('get_product_details', enrichedProductDetails ? {
        product_brief: summarizeProductForAI(enrichedProductDetails),
        product: enrichedProductDetails
      } : { error: 'Product not found' })
    };
  }

  if (funcName === 'compare_products') {
    const ids = Array.isArray(args.productIds) ? args.productIds.slice(0, 3) : [];
    const { data: productsToCompare } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('merchant_id', merchant.id)
      .in('id', ids);

    const comparedProducts = (await attachCommerceSignalsToProducts(productsToCompare || []))
      .map((product) => buildDecisionSupport(product, { source: 'details' }))
      .map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        compare_at_price: product.compare_at_price,
        stock_status: (product.stock_quantity ?? 0) > 0 ? ((product.stock_quantity ?? 0) <= 5 ? `only ${product.stock_quantity} left` : 'in stock') : 'out of stock',
        variant_count: (product.variants || []).length,
        rating: product.rating,
        review_count: product.review_count,
        review_summary: product.review_summary,
        popularity_reason: product.popularity_reason,
        ai_reason: product.ai_reason,
        ai_tradeoff: product.ai_tradeoff,
      }));

    const cheapest = [...comparedProducts].sort((a, b) => Number(a.price) - Number(b.price))[0];
    const highestRated = [...comparedProducts]
      .filter((product) => Number.isFinite(Number(product.rating)))
      .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0];
    const verdict = highestRated
      ? `${highestRated.name} is the strongest all-round pick`
      : cheapest
        ? `${cheapest.name} is the best value pick`
        : 'these are the closest matches right now';
    const bestFor = [
      cheapest ? `${cheapest.name} if price matters most` : null,
      highestRated && highestRated.id !== cheapest?.id ? `${highestRated.name} if buyer confidence matters most` : null,
      comparedProducts.find((product) => product.variant_count && product.variant_count > 1)
        ? `${comparedProducts.find((product) => product.variant_count && product.variant_count > 1)?.name} if you want more options`
        : null
    ].filter(Boolean) as string[];
    const tradeoffs = comparedProducts.map((product) => product.ai_tradeoff).filter(Boolean).slice(0, 3);

    ctx.comparisonResult = {
      products: comparedProducts,
      verdict,
      bestFor,
      tradeoffs
    };
    ctx.lastStableResultId = `comparison:${Date.now()}`;

    return { toolMessage: makeToolMsg('compare_products', ctx.comparisonResult) };
  }

  if (funcName === 'get_checkout_confidence') {
    const confidence = await computeCheckoutConfidence({ customerInfo: args.customerInfo, couponCode: args.couponCode });
    return { toolMessage: makeToolMsg('get_checkout_confidence', confidence) };
  }

  if (funcName === 'add_to_cart') {
    const { data: product } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('id', args.productId)
      .eq('merchant_id', merchant.id)
      .single();

    const quantity = args.quantity || 1;
    let variant: ToolVariant | null = null;
    let variants: ToolVariant[] = [];

    const { data: productVariants } = await supabase
      .from('product_variants')
      .select('id, product_id, name, price, stock_quantity, options')
      .eq('product_id', args.productId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    variants = productVariants || [];

    if (!args.variantId && variants.length > 1) {
      const suggestionButtons = buildVariantChoiceButtons(variants);
      ctx.suggestionButtons = suggestionButtons;
      ctx.variantPrompt = {
        productId: args.productId,
        productName: product?.name || 'this item',
        options: variants.map((item) => ({
          id: item.id,
          label: item.name || [item.options?.size, item.options?.color].filter(Boolean).join(' / ') || 'Default',
          price: item.price
        }))
      };
      return {
        toolMessage: makeToolMsg('add_to_cart', {
          success: false,
          variant_required: true,
          productId: args.productId,
          productName: product?.name,
          message: 'Variant required before adding to cart',
          variants: variants.map((item) => ({
            id: item.id,
            name: item.name || [item.options?.size, item.options?.color].filter(Boolean).join(' / ') || 'Default',
            price: item.price,
            stock_quantity: item.stock_quantity
          })),
          suggestionButtons
        })
      };
    }

    if (!args.variantId && variants.length === 1) {
      variant = variants[0];
    }

    if (args.variantId) {
      variant = variants.find((item) => item.id === args.variantId) || null;
      if (!variant || variant.product_id !== args.productId) {
        ctx.recoveryState = buildRecoveryState('resume_results', 'that option is unavailable right now', [
          { label: 'show options again', action: '__retry__' },
          { label: 'browse store', action: '__browse__' },
        ]);
        return { toolMessage: makeToolMsg('add_to_cart', { success: false, message: 'Selected variant is unavailable' }) };
      }
    }

    const inStock = variant
      ? (variant.stock_quantity == null || variant.stock_quantity >= quantity)
      : !!(product && (product.stock_quantity === null || product.stock_quantity >= quantity));

    if (inStock) {
      ctx.cartActions.push({
        type: 'add_to_cart',
        productId: args.productId,
        quantity,
        ...(variant ? { variantId: variant.id, variantName: variant.name, variantPrice: variant.price } : {})
      });
      ctx.lastStableResultId = `cart:${Date.now()}`;
    }
    if (!inStock) {
      ctx.recoveryState = buildRecoveryState('resume_results', 'that item is out of stock right now', [
        { label: 'show alternatives', action: 'show alternatives' },
        { label: 'browse store', action: '__browse__' },
      ]);
    }
    return { toolMessage: makeToolMsg('add_to_cart', { success: inStock, message: inStock ? 'Added to cart' : 'Out of stock' }) };
  }

  if (funcName === 'set_bargained_price') {
    const result = await setStorefrontBargainedPrice({
      merchant,
      productId: args.productId,
      bargainedPrice: Number(args.bargainedPrice),
      sessionId,
      consumerEmail,
      consumerProfile,
      storeBargainEnabled,
      formatPrice,
    });

    if (result.success && result.bargainResult && result.cartAction) {
      ctx.bargainResult = result.bargainResult;
      ctx.cartActions.push(result.cartAction);
    }

    return {
      toolMessage: makeToolMsg('set_bargained_price', result.success ? {
        success: true,
        message: result.message,
        pre_authorized: result.pre_authorized,
        ...(result.bargainResult || {}),
      } : result)
    };
  }

  if (funcName === 'apply_coupon') {
    const hasBargainedItems = activeBargains && activeBargains.length > 0;

    if (hasBargainedItems) {
      return { toolMessage: makeToolMsg('apply_coupon', { success: false, error: 'Cannot apply discount codes when cart has bargained prices. The bargained prices are already special deals!' }) };
    }

    const { data: discounts } = await supabase
      .from('discounts')
      .select('*')
      .eq('merchant_id', merchant.id)
      .eq('code', args.code.toUpperCase())
      .limit(1);

    const discount = discounts?.[0];
    let result: Record<string, unknown> = { success: false, error: 'Invalid discount code' };

    if (discount) {
      const now = new Date();
      const isActive = (!discount.starts_at || new Date(discount.starts_at) <= now) &&
                     (!discount.ends_at || new Date(discount.ends_at) > now) &&
                     (!discount.usage_limit || discount.used_count < discount.usage_limit);

      if (isActive) {
        ctx.couponResult = {
          code: discount.code,
          discountType: discount.type,
          discountValue: discount.value,
          minOrderAmount: discount.min_order_amount
        };
        ctx.cartActions.push({ type: 'apply_coupon', coupon: ctx.couponResult });
        result = { success: true, ...ctx.couponResult };
      } else {
        result = { success: false, error: 'Discount code is expired or inactive' };
      }
    }
    return { toolMessage: makeToolMsg('apply_coupon', result) };
  }

  if (funcName === 'check_previous_purchases') {
    const purchaseSummary = await getCustomerPurchaseSummary(merchant.id, args.email);
    return { toolMessage: makeToolMsg('check_previous_purchases', purchaseSummary) };
  }

  if (funcName === 'update_agent_memory') {
    const { error } = await supabaseAdmin.from('agent_memory').upsert({
      consumer_email: args.email,
      memory_key: args.key,
      memory_value: args.value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'consumer_email,memory_key' });
    return { toolMessage: makeToolMsg('update_agent_memory', { success: !error, error }) };
  }

  if (funcName === 'upsert_customer_intent') {
    const { error } = await supabaseAdmin.from('customer_intents').upsert({
      consumer_email: args.email,
      merchant_id: merchant.id,
      intent_type: args.intent_type,
      goal: args.goal,
      constraints: args.constraints || {},
      suggested_by_ai: args.suggested_by_ai || false,
      status: 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'consumer_email,intent_type,goal' });
    return { toolMessage: makeToolMsg('upsert_customer_intent', { success: !error, error }) };
  }

  if (funcName === 'create_agent_plan') {
    const { data, error } = await supabaseAdmin.from('agent_plans').insert({
      intent_id: args.intentId,
      steps: args.steps,
      status: 'planning',
      updated_at: new Date().toISOString()
    }).select().single();
    return { toolMessage: makeToolMsg('create_agent_plan', { success: !error, planId: data?.id, error }) };
  }

  if (funcName === 'log_negotiation') {
    const { error } = await supabaseAdmin.from('negotiation_logs').insert({
      intent_id: args.intentId,
      buyer_offer: args.buyerOffer,
      merchant_offer: args.merchantOffer,
      round_number: args.round || 1,
      outcome: args.outcome || 'pending'
    });
    return { toolMessage: makeToolMsg('log_negotiation', { success: !error, error }) };
  }

  if (funcName === 'get_agent_permissions') {
    const { data: permissions } = await supabaseAdmin.from('agent_permissions').select('*').eq('consumer_email', args.email).single();
    return { toolMessage: makeToolMsg('get_agent_permissions', permissions || { autonomy_level: 'assisted', max_spend_limit: 0, can_negotiate: true }) };
  }

  if (funcName === 'update_web_layout') {
    ctx.layoutResult = args as { sections: Record<string, unknown>[] };
    if (ctx.layoutResult?.sections) {
      for (const section of ctx.layoutResult.sections as Record<string, unknown>[]) {
        const sectionProducts = section.products as ToolProduct[] | undefined;
        if (sectionProducts && sectionProducts.length > 0) {
          section.products = sectionProducts.map((p) => {
            const fullProduct = ctx.products.find(fp => fp.id === p.id || fp.name?.toLowerCase() === p.name?.toLowerCase());
            return fullProduct || p;
          });
        }
      }
    }
    return { toolMessage: makeToolMsg('update_web_layout', { success: true, message: 'Layout updated' }) };
  }

  if (funcName === 'check_auth_status') {
    const isAuthenticated = !!userEmail;
    let profile = null;
    if (isAuthenticated) {
      const { data } = await supabaseAdmin
        .from('store_customers')
        .select('*')
        .eq('merchant_id', merchant.id)
        .eq('email', userEmail)
        .maybeSingle();
      profile = data;
    }
    return { toolMessage: makeToolMsg('check_auth_status', { isAuthenticated, user: isAuthenticated ? { email: userEmail, ...profile } : null }) };
  }

  if (funcName === 'send_login_link') {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/store/${subdomain}/verify`;
    const { error } = await supabaseAdmin.auth.signInWithOtp({ email: args.email, options: { emailRedirectTo: redirectUrl } });
    return { toolMessage: makeToolMsg('send_login_link', { success: !error, email: args.email, message: error ? error.message : 'Login link sent successfully' }) };
  }

  if (funcName === 'trigger_auth') {
    ctx.cartActions.push({ type: 'trigger_auth', reason: args.reason });
    return { toolMessage: makeToolMsg('trigger_auth', { success: true, message: 'Auth modal triggered' }) };
  }

  if (funcName === 'start_checkout') {
    ctx.checkoutConfidence = await computeCheckoutConfidence({ customerInfo: args.customerInfo });
    ctx.cartActions.push({ type: 'start_checkout', customerInfo: args.customerInfo, paymentMethod: args.paymentMethod });
    return { toolMessage: makeToolMsg('start_checkout', { success: true, message: 'Checkout initiated' }) };
  }

  if (funcName === 'show_suggestion_buttons') {
    ctx.suggestionButtons = args.options || [];
    return { toolMessage: makeToolMsg('show_suggestion_buttons', { success: true, message: 'Suggestion buttons displayed' }) };
  }

  if (funcName === 'log_consumer_event') {
    const eventData = (args?.eventData && typeof args.eventData === 'object') ? args.eventData : {};
    let error: { message?: string } | null = null;

    if (args.email) {
      const eventType = args.eventType || 'event';
      const now = new Date().toISOString();
      const { data: existingCustomer, error: customerError } = await supabaseAdmin
        .from('store_customers')
        .select('id, metadata')
        .eq('merchant_id', merchant.id)
        .eq('email', args.email)
        .maybeSingle();

      if (customerError) {
        error = customerError;
      } else if (existingCustomer) {
        const metadata = existingCustomer.metadata || {};
        const updatedMetadata: Record<string, unknown> = {
          ...metadata,
          [eventType]: eventData,
          last_intelligence_update: now,
        };
        const updatePayload: Record<string, unknown> = { metadata: updatedMetadata, updated_at: now };

        if (eventType === 'address_update' || eventData.address || eventData.pincode) {
          updatePayload.address = eventData.address || null;
          updatePayload.city = eventData.city || null;
          updatePayload.state = eventData.state || null;
          updatePayload.pincode = eventData.pincode || null;
          updatePayload.country = eventData.country || null;
        }

        const { error: updateError } = await supabaseAdmin
          .from('store_customers')
          .update(updatePayload)
          .eq('id', existingCustomer.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabaseAdmin.from('store_customers').insert({
          merchant_id: merchant.id,
          email: args.email,
          address: eventData.address || null,
          city: eventData.city || null,
          state: eventData.state || null,
          pincode: eventData.pincode || null,
          country: eventData.country || null,
          metadata: {
            [eventType]: eventData,
            last_intelligence_update: now,
          },
        });
        error = insertError;
      }
    }

    return { toolMessage: makeToolMsg('log_consumer_event', { success: !error, error }) };
  }

  if (funcName === 'get_order_status') {
    const orderData = await getCustomerOrderStatus(merchant.id, args.email, args.orderId);
    return { toolMessage: makeToolMsg('get_order_status', orderData || { error: 'No orders found' }) };
  }

  if (funcName === 'request_refund_or_return') {
    const result = await createStorefrontRefundReview({
      merchant,
      orderId: args.orderId,
      email: args.email,
      consumerEmail,
      consumerProfile,
      reason: args.reason,
      sessionId,
      formatPrice,
    });

    return {
      toolMessage: makeToolMsg('request_refund_or_return', result),
      ...(result.skip ? { skip: true } : {}),
    };
  }

  if (funcName === 'create_support_request') {
    const result = await createStorefrontSupportRequest({
      merchant,
      email: args.email,
      consumerEmail,
      topic: args.topic,
      details: args.details,
      orderId: args.orderId,
    });

    return {
      toolMessage: makeToolMsg('create_support_request', result),
      ...(result.skip ? { skip: true } : {}),
    };
  }

  if (funcName === 'apply_loyalty_reward') {
    const result = await applyStorefrontLoyaltyReward({
      merchant,
      rewardType: args.rewardType,
      sessionId,
      consumerEmail,
      consumerProfile,
    });

    return { toolMessage: makeToolMsg('apply_loyalty_reward', result) };
  }

  if (funcName === 'generate_direct_payment_link') {
    if (!cart || cart.length === 0) {
      ctx.recoveryState = buildRecoveryState('browse', 'your cart is empty right now', [
        { label: 'browse store', action: '__browse__' },
        { label: 'show popular picks', action: "what's popular?" },
      ]);
      return { toolMessage: makeToolMsg('generate_direct_payment_link', { success: false, error: 'Cart is empty. Add items before generating a payment link.' }), skip: true };
    }
    if (!args.customerInfo?.email) {
      return { toolMessage: makeToolMsg('generate_direct_payment_link', { success: false, error: 'Customer email is required to generate a payment link.' }), skip: true };
    }

    ctx.checkoutConfidence = await computeCheckoutConfidence({ customerInfo: args.customerInfo });

    const { data: merchantWithPayments } = await supabase
      .from('merchants')
      .select('payment_methods, shipping_settings, tax_settings')
      .eq('id', merchant.id)
      .single();

    const paymentMethods = merchantWithPayments?.payment_methods || {};
    const stripeConfig = (paymentMethods as Record<string, unknown>).stripe as ToolStripeConfig | undefined;

    if (!stripeConfig?.enabled) {
      ctx.recoveryState = buildRecoveryState('resume_checkout', 'card payments are unavailable right now', [
        { label: 'try checkout instead', action: '__checkout__' },
        { label: 'browse store', action: '__browse__' },
      ]);
      return { toolMessage: makeToolMsg('generate_direct_payment_link', { success: false, error: 'Stripe is not enabled for this store.' }), skip: true };
    }

    const isTestMode = stripeConfig.test_mode;
    const secretKey = isTestMode ? stripeConfig.test_secret_key : stripeConfig.secret_key;

    if (!secretKey) {
      ctx.recoveryState = buildRecoveryState('resume_checkout', 'payment setup is temporarily unavailable', [
        { label: 'try checkout instead', action: '__checkout__' },
        { label: 'browse store', action: '__browse__' },
      ]);
      return { toolMessage: makeToolMsg('generate_direct_payment_link', { success: false, error: `Stripe ${isTestMode ? 'test' : 'live'} secret key is missing.` }), skip: true };
    }

    const shippingPolicy = merchant.ai_shipping_policy || 'autonomous';
    if (shippingPolicy === 'disabled') {
      ctx.recoveryState = buildRecoveryState('callback', 'shipping needs support help for this store', [
        { label: 'request callback', action: '__callback__' },
        { label: 'browse store', action: '__browse__' },
      ]);
      return { toolMessage: makeToolMsg('generate_direct_payment_link', { success: false, error: 'Shipping selection is disabled for this store.' }), skip: true };
    }
    if (shippingPolicy === 'approval_required') {
      const pendingBargains = (activeBargains || []).reduce((acc: Record<string, unknown>, b: ToolBargainEntry) => {
        acc[b.product_id] = {
          bargainedPrice: b.bargained_price,
          originalPrice: b.original_price,
          discountPercentage: b.discount_percentage
        };
        return acc;
      }, {});
      logAIDecision({
        merchantId: merchant.id, sessionId, consumerEmail,
        decisionType: 'shipping_selected',
        summary: 'Shipping requires merchant approval',
        factors: {
          policy: 'approval_required',
          action: 'payment_link',
          subdomain,
          cart,
          customerInfo: args.customerInfo,
          bargainedPrices: pendingBargains
        },
        outcome: { status: 'pending', reason: 'requires_approval' },
        toolCalled: 'generate_direct_payment_link'
      });
      return { toolMessage: makeToolMsg('generate_direct_payment_link', { success: false, error: 'Shipping selection requires merchant approval.' }), skip: true };
    }

    const cartBargainedPrices = activeBargains || [];
    const subtotal = cart.reduce((acc: number, item: ToolCartItem) => {
      const bargainedPrice = cartBargainedPrices.find((b) => b.product_id === item.id);
      const itemPrice = bargainedPrice ? bargainedPrice.bargained_price : item.price;
      return acc + (itemPrice * item.quantity);
    }, 0);

    const shippingSettings = merchantWithPayments?.shipping_settings || { zones: [] };
    const customerCountry = args.customerInfo?.country || 'US';
    let shipping = 0;
    const shippingZones = (shippingSettings as ToolShippingSettings).zones;
    if (shippingZones && shippingZones.length > 0) {
      const matchingZone = shippingZones.find((zone) => zone.countries?.includes(customerCountry));
      if (matchingZone?.rates?.[0]) shipping = matchingZone.rates[0].price;
      else if (shippingZones[0]?.rates?.[0]) shipping = shippingZones[0].rates[0].price;
    } else {
      shipping = subtotal > 100 ? 0 : 15;
    }

    const taxSettings = merchantWithPayments?.tax_settings || { enabled: false, default_rate: 0 };
    let tax = 0;
    let taxRate = 0;
    let taxName = 'Tax';
    const taxSettingsCast = taxSettings as ToolTaxSettings;
    if (taxSettingsCast.enabled) {
      const countryRate = taxSettingsCast.country_rates?.find((c) => c.country_code === customerCountry);
      taxRate = countryRate?.rate || taxSettingsCast.default_rate || 0;
      taxName = countryRate?.tax_name || 'Tax';
      if (taxRate > 0) tax = subtotal * (taxRate / 100);
    }

    const bargainSavings = cart.reduce((acc: number, item: ToolCartItem) => {
      const bp = cartBargainedPrices.find((b) => b.product_id === item.id);
      return bp ? acc + ((item.price - bp.bargained_price) * item.quantity) : acc;
    }, 0);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const checkout = await createStripeOrderCheckoutSession({
        merchant: {
          ...merchant,
          payment_methods: paymentMethods,
        },
        subdomain,
        customerInfo: args.customerInfo,
        validatedCart: cart.map((item) => ({
          id: item.id,
          name: item.name || '',
          price: item.price,
          quantity: item.quantity,
          image_url: item.image_url,
          variant_id: item.variant?.id || null,
          variant_name: item.variantName || item.variant?.name || null,
        })),
        paymentDetails: {
          bargained_items: cartBargainedPrices.length > 0 ? cartBargainedPrices.map((b) => ({
            product_id: b.product_id,
            original_price: b.original_price,
            bargained_price: b.bargained_price,
            discount_percentage: b.discount_percentage,
          })) : undefined,
        },
        shipping,
        tax,
        taxRate,
        taxName,
        source: 'ai_payment_link',
        successUrlBase: `${baseUrl}/store/${subdomain}/checkout`,
        cancelUrlBase: `${baseUrl}/store/${subdomain}/checkout`,
        reserveInventory: true,
        stripeSecretKeyOverride: secretKey,
        bargainedItems: cartBargainedPrices.map((b) => ({
          product_id: b.product_id,
          original_price: b.original_price,
          bargained_price: b.bargained_price,
          discount_percentage: b.discount_percentage,
        })),
        aiAssisted: true,
        aiNegotiated: cartBargainedPrices.length > 0,
        aiRevenueDelta: bargainSavings > 0 ? -bargainSavings : 0,
      });

      supabaseAdmin.from('ai_events').insert({
        merchant_id: merchant.id,
        event_type: 'order_ai_assisted',
        consumer_email: args.customerInfo?.email,
        session_id: sessionId,
        event_data: {
          order_id: checkout.order.id,
          total: checkout.total,
          items_count: cart.length,
          negotiated: cartBargainedPrices.length > 0,
          bargain_savings: bargainSavings,
          source: 'ai_payment_link'
        }
      }).then(() => {});

      ctx.cartActions.push({ type: 'payment_link_generated', paymentUrl: checkout.session.url, orderId: checkout.order.id, total: checkout.total });
      ctx.lastStableResultId = `checkout:${checkout.order.id}`;
      return { toolMessage: makeToolMsg('generate_direct_payment_link', { success: true, paymentUrl: checkout.session.url, orderId: checkout.order.id, total: checkout.total, currency: checkout.currency, message: 'Payment link generated successfully!' }) };
    } catch (stripeErr: unknown) {
      logger.error('Stripe session creation error:', stripeErr);
      ctx.recoveryState = buildRecoveryState('resume_checkout', 'payment link generation failed', [
        { label: 'try again', action: '__retry__' },
        { label: 'checkout instead', action: '__checkout__' },
        { label: 'browse store', action: '__browse__' },
      ]);
      return { toolMessage: makeToolMsg('generate_direct_payment_link', { success: false, error: `Failed to create payment session: ${stripeErr instanceof Error ? stripeErr.message : 'Unknown error'}` }) };
    }
  }

    if (funcName === 'get_recommendations') {
      const enrichedRecommendations = await getStorefrontRecommendations({
        merchantId: merchant.id,
        basedOn: args.basedOn,
        cart: cart.map(c => ({ name: c.name || '', id: c.id })),
        formatPrice,
      });
      ctx.refinementOptions = buildRefinementOptions(enrichedRecommendations as ToolProduct[]);
      ctx.lastStableResultId = `recommendations:${Date.now()}`;
      enrichedRecommendations.forEach(p => {
        if (!ctx.products.find(existing => existing.id === p.id)) ctx.products.push(p);
      });
      return { toolMessage: makeToolMsg('get_recommendations', enrichedRecommendations) };
    }

  if (funcName === 'remove_from_cart') {
    ctx.cartActions.push({
      type: 'remove_from_cart',
      productId: args.productId,
      ...(args.variantId ? { variantId: args.variantId } : {}),
      ...(args.variantName ? { variantName: args.variantName } : {})
    });
    return { toolMessage: makeToolMsg('remove_from_cart', { success: true, message: 'Removed from cart' }) };
  }

  return { toolMessage: makeToolMsg(funcName, { success: false, error: 'Unknown tool' }) };
}
