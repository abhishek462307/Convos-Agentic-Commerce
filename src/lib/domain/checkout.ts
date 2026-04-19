import Stripe from 'stripe';
import { sendLowStockAlertEmail, sendNewOrderNotificationEmail, sendOrderConfirmationEmail } from '@/lib/email';
import logger from '@/lib/logger';
import { getAllRates } from '@/lib/shipping';
import type { Address } from '@/lib/shipping/types';
import type { Merchant, Discount } from '@/types';

type CheckoutLineItem = {
  price_data: {
    currency: string
    product_data: {
      name: string
      images?: string[]
    }
    unit_amount: number
  }
  quantity: number
}

type SupabaseLike = { from: (table: string) => any }

interface CarrierConfig {
  is_enabled?: boolean;
  credentials?: Record<string, unknown>;
  is_test_mode?: boolean;
}

interface CheckoutOrderRecord {
  id: string;
  merchant_id: string;
  [key: string]: unknown;
}

export interface CountryTaxRate {
  country_code: string
  country_name: string
  rate: number
  tax_name?: string
}

export interface TaxSettings {
  enabled: boolean
  default_rate: number
  include_in_price: boolean
  country_rates: CountryTaxRate[]
}

export interface ShippingRate {
  id: string
  name: string
  price: number
}

export interface ShippingZone {
  id: string
  name: string
  countries: string[]
  rates: ShippingRate[]
}

export interface ShippingSettings {
  zones: ShippingZone[]
}

export interface SanitizedCartItem {
  id: string
  quantity: number
  variant?: {
    id?: string
  }
  variantName?: string | null
}

export interface ValidatedCheckoutItem {
  id: string
  name: string
  image_url?: string | null
  category?: string | null
  quantity: number
  price: number
  variant_id: string | null
  variant_name: string | null
}

interface StorefrontProductRecord {
  id: string
  name: string
  price: number
  stock_quantity: number | null
  track_quantity?: boolean | null
  status?: string | null
  image_url?: string | null
  category?: string | null
}

interface ProductVariantRecord {
  id: string
  product_id: string
  price: number
  stock_quantity: number | null
  name?: string | null
}

type BargainedPrice = {
  product_id: string
  original_price: number
  bargained_price: number
  discount_percentage?: number
}

export async function fetchMerchantForCheckout(input: {
  supabase: SupabaseLike
  subdomain: string
}) {
  const { data: merchant, error } = await input.supabase
    .from('merchants')
    .select('id, store_name, currency, payment_methods, shipping_settings, tax_settings, business_address, ai_shipping_policy, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, store_email, order_notification_email, low_stock_threshold, low_stock_alerts_enabled')
    .eq('subdomain', input.subdomain)
    .single();

  if (error || !merchant) {
    throw error || new Error('Merchant not found');
  }

  return merchant;
}

export async function loadValidatedCheckoutContext(input: {
  supabase: SupabaseLike
  merchantId: string
  sanitizedCart: SanitizedCartItem[]
}) {
  const productIds = Array.from(new Set(input.sanitizedCart.map((item) => item.id)));
  const { data: products, error: productsError } = await input.supabase
    .from('products')
    .select('id, name, price, stock_quantity, track_quantity, status, image_url, category')
    .eq('merchant_id', input.merchantId)
    .in('id', productIds);

  if (productsError || !products || products.length !== productIds.length) {
    throw new Error('One or more products are unavailable');
  }

  const variantIds = Array.from(new Set(input.sanitizedCart.map((item) => item?.variant?.id).filter(Boolean)));
  let variants: ProductVariantRecord[] = [];
  if (variantIds.length > 0) {
    const { data } = await input.supabase
      .from('product_variants')
      .select('id, product_id, price, stock_quantity, name')
      .in('id', variantIds);
    variants = data || [];
  }

  return validateStorefrontCheckoutCart({
    sanitizedCart: input.sanitizedCart,
    products,
    variants,
  });
}

export async function loadActiveCheckoutBargains(input: {
  supabase: SupabaseLike
  merchantId: string
  sessionId?: string | null
}) {
  if (!input.sessionId) {
    return {
      bargainedPrices: [] as BargainedPrice[],
      hasBargainedItems: false,
    };
  }

  const { data: bargains } = await input.supabase
    .from('bargained_prices')
    .select('*')
    .eq('session_id', input.sessionId)
    .eq('merchant_id', input.merchantId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  const bargainedPrices = (bargains || []) as BargainedPrice[];
  return {
    bargainedPrices,
    hasBargainedItems: bargainedPrices.length > 0,
  };
}

export async function resolveCheckoutDiscount(input: {
  supabase: SupabaseLike
  merchantId: string
  discountId?: string | null
  subtotal: number
  hasBargainedItems: boolean
}) {
  if (!input.discountId || input.hasBargainedItems) {
    return null;
  }

  const { data: discount } = await input.supabase
    .from('discounts')
    .select('*')
    .eq('id', input.discountId)
    .eq('merchant_id', input.merchantId)
    .single();

  return resolveApplicableDiscount({
    discount,
    subtotal: input.subtotal,
    hasBargainedItems: input.hasBargainedItems,
  });
}

export async function resolveCheckoutShipping(input: {
  validatedCart: ValidatedCheckoutItem[]
  merchant: Merchant
  customerInfo: Record<string, string>
  customerCountry: string
  shippingRateId?: string | null
}) {
  const shippingSettings = (input.merchant.shipping_settings as ShippingSettings) || { zones: [] };
  const shippingCarriers: Record<string, CarrierConfig> = (input.merchant.shipping_settings as { carriers?: Record<string, CarrierConfig> })?.carriers || {};
  let shipping = 0;
  let shippingZoneName = '';
  let shippingRateName = '';
  let carrierRateFound = false;

  const enabledCarriers = Object.entries(shippingCarriers)
    .filter(([, cfg]) => cfg.is_enabled && cfg.credentials)
    .map(([id, cfg]) => ({
      carrierId: id,
      credentials: cfg.credentials as Record<string, string>,
      testMode: cfg.is_test_mode ?? false,
    }));

  // Check for structured merchant address in shipping_settings or fall back to business_address
  const merchantShippingFrom = (input.merchant.shipping_settings as { from_address?: Address })?.from_address;
  const hasCompleteFromAddr = merchantShippingFrom?.street1 && merchantShippingFrom?.city && 
                            merchantShippingFrom?.state && merchantShippingFrom?.postalCode && merchantShippingFrom?.country;
  
  // Only attempt real-time carrier rates if merchant has complete origin address
  if (enabledCarriers.length > 0 && hasCompleteFromAddr && 
      input.customerInfo?.address && input.customerInfo?.city && input.customerInfo?.state && 
      input.customerInfo?.pincode && input.customerInfo?.country) {
    try {
      const fromAddr: Address = merchantShippingFrom!;
      const toAddr: Address = {
        name: input.customerInfo.name || '',
        street1: input.customerInfo.address,
        city: input.customerInfo.city,
        state: input.customerInfo.state,
        postalCode: input.customerInfo.pincode,
        country: input.customerInfo.country,
      };

      const totalWeight = input.validatedCart.reduce((acc, item) => acc + (item.quantity || 1), 0);
      const rates = await getAllRates(fromAddr, toAddr, [{
        weight: Math.max(1, totalWeight),
        weightUnit: 'lb',
        length: 10,
        width: 8,
        height: 4,
        dimensionUnit: 'in',
      }], enabledCarriers);

      if (rates && rates.length > 0) {
        shipping = rates[0].price;
        shippingZoneName = 'Real-time Carrier Rate';
        shippingRateName = `${rates[0].carrierId.toUpperCase()} ${rates[0].serviceName}`;
        carrierRateFound = true;
      }
    } catch (error) {
      logger.error('Error fetching real-time rates during checkout:', error);
    }
  }

  if (!carrierRateFound && shippingSettings.zones?.length > 0) {
    const manualShipping = resolveManualShippingRate({
      shippingSettings,
      customerCountry: input.customerCountry,
      shippingRateId: input.shippingRateId,
    });
    shipping = manualShipping.shipping;
    shippingZoneName = manualShipping.shippingZoneName;
    shippingRateName = manualShipping.shippingRateName;
  }

  return {
    shipping,
    shippingZoneName,
    shippingRateName,
  };
}

export async function resolveCheckoutConversationId(input: {
  supabase: SupabaseLike
  conversationId?: string | null
}) {
  if (!input.conversationId) {
    return null;
  }

  const { data: convo } = await input.supabase
    .from('conversations')
    .select('id')
    .eq('id', input.conversationId)
    .single();

  return convo ? input.conversationId : null;
}

export function sanitizeCheckoutCart(rawCart: unknown): SanitizedCartItem[] {
    return (Array.isArray(rawCart) ? rawCart : [] as any[])
    .filter((item: any) => item && item.id && Number(item.quantity) > 0)
    .map((item: any) => ({
      ...item,
      quantity: Math.max(1, Math.floor(Number(item.quantity))),
    }));
}

export function validateStorefrontCheckoutCart(input: {
  sanitizedCart: SanitizedCartItem[]
  products: StorefrontProductRecord[]
  variants?: ProductVariantRecord[]
}) {
  const productMap = new Map(input.products.map((product) => [product.id, product]));
  const variantMap = new Map((input.variants || []).map((variant) => [variant.id, variant]));
  const validatedCart: ValidatedCheckoutItem[] = [];

  for (const item of input.sanitizedCart) {
    const product = productMap.get(item.id);
    if (!product || (product.status && product.status !== 'active')) {
      throw new Error('One or more products are unavailable');
    }

    const variantId = item?.variant?.id;
    const variant = variantId ? variantMap.get(variantId) : null;
    if (variantId && (!variant || variant.product_id !== product.id)) {
      throw new Error('Selected variant is unavailable');
    }

    const quantity = item.quantity;
    if (variant && variant.stock_quantity !== null && variant.stock_quantity < quantity) {
      throw new Error(`${product.name} is out of stock`);
    }
    if ((product.track_quantity ?? true) && product.stock_quantity !== null && product.stock_quantity < quantity) {
      throw new Error(`${product.name} is out of stock`);
    }

    validatedCart.push({
      id: product.id,
      name: product.name,
      image_url: product.image_url,
      category: product.category,
      quantity,
      price: variant?.price ?? product.price,
      variant_id: variant?.id || null,
      variant_name: item.variantName || variant?.name || null,
    });
  }

  return {
    validatedCart,
    productMap,
    variantMap,
  };
}

export function resolveApplicableDiscount(input: {
  discount: Discount | null
  subtotal: number
  hasBargainedItems: boolean
}) {
  if (!input.discount || input.hasBargainedItems) {
    return null;
  }

  const now = new Date();
  const isValid = (!input.discount.starts_at || new Date(input.discount.starts_at) <= now) &&
    (!input.discount.ends_at || new Date(input.discount.ends_at) > now) &&
    (!input.discount.usage_limit || (input.discount.used_count ?? 0) < input.discount.usage_limit) &&
    (input.subtotal >= (input.discount.min_order_amount ?? 0));

  return isValid ? input.discount : null;
}

export function resolveManualShippingRate(input: {
  shippingSettings: ShippingSettings
  customerCountry: string
  shippingRateId?: string | null
}) {
  const { shippingSettings, customerCountry, shippingRateId } = input;
  const zones = shippingSettings?.zones || [];
  if (zones.length === 0) {
    return {
      shipping: 0,
      shippingZoneName: '',
      shippingRateName: '',
    };
  }

  const matchingZone = zones.find((zone) => zone.countries?.includes(customerCountry));
  const fallbackZone = zones.find(
    (zone) =>
      zone.countries?.length === 0 ||
      zone.name?.toLowerCase().includes('rest of world') ||
      zone.name?.toLowerCase().includes('default')
  );
  const zone = matchingZone || fallbackZone || zones[0];
  const selectedRate = shippingRateId
    ? zone?.rates?.find((rate) => rate.id === shippingRateId)
    : zone?.rates?.[0];
  const rate = selectedRate || zone?.rates?.[0];

  return {
    shipping: rate?.price || 0,
    shippingZoneName: zone?.name || '',
    shippingRateName: rate?.name || '',
  };
}

export function calculateCheckoutTotals(input: {
  validatedCart: ValidatedCheckoutItem[]
  bargainedPrices?: BargainedPrice[]
  appliedDiscount?: { type?: string; value?: number } | null
  shipping: number
  taxSettings: TaxSettings
  customerCountry: string
}) {
  const { validatedCart, bargainedPrices = [], appliedDiscount, shipping, taxSettings, customerCountry } = input;
  const subtotal = validatedCart.reduce((acc, item) => {
    const bargainedPrice = bargainedPrices.find((entry) => entry.product_id === item.id);
    const unitPrice = bargainedPrice ? Number(bargainedPrice.bargained_price) : Number(item.price);
    return acc + unitPrice * item.quantity;
  }, 0);

  const bargainSavings = validatedCart.reduce((acc, item) => {
    const bargainedPrice = bargainedPrices.find((entry) => entry.product_id === item.id);
    if (!bargainedPrice) return acc;
    return acc + (Number(item.price) - Number(bargainedPrice.bargained_price)) * item.quantity;
  }, 0);

  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.type === 'percentage') {
      discountAmount = subtotal * (Number(appliedDiscount.value || 0) / 100);
    } else {
      discountAmount = Number(appliedDiscount.value || 0);
    }
  }
  discountAmount = Math.min(discountAmount, subtotal);

  let taxRate = 0;
  let taxName = 'Tax';
  let tax = 0;
  if (taxSettings?.enabled) {
    const countryRate = taxSettings.country_rates?.find((entry) => entry.country_code === customerCountry);
    taxRate = Number(countryRate?.rate ?? taxSettings.default_rate ?? 0);
    taxName = countryRate?.tax_name || 'Tax';
    if (taxRate > 0) {
      const taxableSubtotal = Math.max(0, subtotal - discountAmount);
      tax = taxSettings.include_in_price
        ? taxableSubtotal - taxableSubtotal / (1 + taxRate / 100)
        : taxableSubtotal * (taxRate / 100);
    }
  }

  const total = taxSettings?.include_in_price
    ? subtotal - discountAmount + shipping
    : subtotal - discountAmount + shipping + tax;

  return {
    subtotal,
    bargainSavings,
    discountAmount,
    tax,
    taxRate,
    taxName,
    total,
  };
}

export function buildCheckoutPaymentDetails(input: {
  appliedDiscount?: Discount | null
  discountAmount: number
  bargainedPrices?: BargainedPrice[]
  bargainSavings: number
  hasBargainedItems: boolean
  sessionId?: string | null
}) {
  const paymentDetails: Record<string, unknown> = {};
  if (input.appliedDiscount) {
    paymentDetails.discount_applied = input.appliedDiscount.code;
    paymentDetails.discount_amount = input.discountAmount;
    paymentDetails.discount_id = input.appliedDiscount.id;
  }
  if (input.hasBargainedItems) {
    paymentDetails.bargained_items = (input.bargainedPrices || []).map((entry) => ({
      product_id: entry.product_id,
      original_price: entry.original_price,
      bargained_price: entry.bargained_price,
      discount_percentage: entry.discount_percentage,
    }));
    paymentDetails.bargain_savings = input.bargainSavings;
  }
  if (input.sessionId) {
    paymentDetails.bargain_session_id = input.sessionId;
  }
  return paymentDetails;
}

export function buildCheckoutReturnUrls(input: {
  origin: string
  host: string
  subdomain: string
  orderId: string
}) {
  const { origin, host, subdomain, orderId } = input;
  const hostOnly = (host || '').split(':')[0].toLowerCase();
  const isMainDomain = ['localhost', '127.0.0.1'].includes(hostOnly) || hostOnly.endsWith('.vercel.app');

  return {
    successUrl: isMainDomain
      ? `${origin}/store/${subdomain}/checkout?success=true&order_id=${orderId}`
      : `${origin}/checkout?success=true&order_id=${orderId}`,
    cancelUrl: isMainDomain
      ? `${origin}/store/${subdomain}/checkout?canceled=true&order_id=${orderId}`
      : `${origin}/checkout?canceled=true&order_id=${orderId}`,
  };
}

export async function createPendingCheckoutOrder(input: {
  supabase: SupabaseLike
  merchantId: string
  conversationId: string | null
  total: number
  subtotal: number
  shipping: number
  tax: number
  customerInfo: Record<string, any>
  paymentMethod: string
  paymentDetails: Record<string, any>
  aiAssisted: boolean
  aiNegotiated: boolean
  aiRevenueDelta: number
}) {
  const { data: order, error } = await input.supabase
    .from('orders')
    .insert([
      {
        merchant_id: input.merchantId,
        conversation_id: input.conversationId,
        total_amount: input.total,
        subtotal: input.subtotal,
        shipping_amount: input.shipping,
        tax_amount: input.tax,
        customer_info: input.customerInfo,
        status: 'pending',
        payment_method: input.paymentMethod,
        payment_details: input.paymentDetails,
        ai_assisted: input.aiAssisted,
        ai_negotiated: input.aiNegotiated,
        ai_revenue_delta: input.aiRevenueDelta,
      },
    ])
    .select()
    .single();

  if (error || !order) {
    throw error || new Error('Failed to create order');
  }

  return order;
}

export async function createCheckoutOrderItems(input: {
  supabase: SupabaseLike
  orderId: string
  merchantId: string
  validatedCart: ValidatedCheckoutItem[]
  bargainedPrices?: BargainedPrice[]
}) {
  const orderItems = input.validatedCart.map((item) => {
    const bargainedPrice = (input.bargainedPrices || []).find((entry) => entry.product_id === item.id);
    return {
      order_id: input.orderId,
      merchant_id: input.merchantId,
      product_id: item.id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price_at_purchase: bargainedPrice ? bargainedPrice.bargained_price : item.price,
    };
  });

  const { error } = await input.supabase.from('order_items').insert(orderItems);
  if (error) {
    throw error;
  }
}

export async function finalizeCashOnDeliveryOrder(input: {
  supabase: SupabaseLike
  orderId: string
  merchantId: string
  validatedCart: ValidatedCheckoutItem[]
  variantMap: Map<string, ProductVariantRecord>
  productMap: Map<string, StorefrontProductRecord>
  appliedDiscount?: Discount | null
  sessionId?: string | null
}) {
  let stockUpdateFailed = false;
  const decrementedItems: Array<{ type: 'variant' | 'product'; id: string; previousStock: number }> = [];

  for (const item of input.validatedCart) {
    if (item.variant_id) {
      const variant = input.variantMap.get(item.variant_id);
      if (variant && variant.stock_quantity !== null) {
        const newStock = Math.max(0, Number(variant.stock_quantity) - item.quantity);
        const { data: updatedVariants, error } = await input.supabase
          .from('product_variants')
          .update({ stock_quantity: newStock })
          .eq('id', item.variant_id)
          .eq('stock_quantity', variant.stock_quantity)
          .select('id');

        if (error || !updatedVariants || updatedVariants.length === 0) {
          stockUpdateFailed = true;
          break;
        }
        decrementedItems.push({ type: 'variant', id: item.variant_id, previousStock: Number(variant.stock_quantity) });
      }
      continue;
    }

    const product = input.productMap.get(item.id);
    if (product && (product.track_quantity ?? true) && product.stock_quantity !== null) {
      const newStock = Math.max(0, Number(product.stock_quantity) - item.quantity);
      const { data: updatedProducts, error } = await input.supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', item.id)
        .eq('stock_quantity', product.stock_quantity)
        .select('id');

      if (error || !updatedProducts || updatedProducts.length === 0) {
        stockUpdateFailed = true;
        break;
      }
      decrementedItems.push({ type: 'product', id: item.id, previousStock: Number(product.stock_quantity) });
    }
  }

  if (stockUpdateFailed) {
    for (const item of decrementedItems) {
      if (item.type === 'variant') {
        await input.supabase.from('product_variants').update({ stock_quantity: item.previousStock }).eq('id', item.id);
      } else {
        await input.supabase.from('products').update({ stock_quantity: item.previousStock }).eq('id', item.id);
      }
    }
    throw new Error('INSUFFICIENT_STOCK');
  }

  if (input.appliedDiscount) {
    if (input.appliedDiscount.usage_limit) {
      const { data: incrementedRows } = await input.supabase
        .from('discounts')
        .update({ used_count: (input.appliedDiscount.used_count || 0) + 1 })
        .eq('id', input.appliedDiscount.id)
        .lt('used_count', input.appliedDiscount.usage_limit)
        .select('id');

      if (!incrementedRows || incrementedRows.length === 0) {
        throw new Error('DISCOUNT_LIMIT_REACHED');
      }
    } else {
      await input.supabase
        .from('discounts')
        .update({ used_count: (input.appliedDiscount.used_count || 0) + 1 })
        .eq('id', input.appliedDiscount.id);
    }
  }

  if (input.sessionId) {
    await input.supabase
      .from('bargained_prices')
      .update({ status: 'used' })
      .eq('session_id', input.sessionId)
      .eq('merchant_id', input.merchantId);
  }
}

export async function syncCheckoutCustomerProfiles(input: {
  supabase: SupabaseLike
  merchantId: string
  orderId: string
  total: number
  customerInfo: Record<string, any>
  validatedCart: ValidatedCheckoutItem[]
  bargainSavings: number
}) {
  const customerEmail = input.customerInfo?.email;
  if (!customerEmail) {
    return;
  }

  const categories = [...new Set(input.validatedCart.map((item) => item.category).filter(Boolean))];
  const now = new Date().toISOString();

  const { data: storeCustomer } = await input.supabase
    .from('store_customers')
    .select('id, total_orders, total_spent, metadata')
    .eq('merchant_id', input.merchantId)
    .eq('email', customerEmail)
    .maybeSingle();

  if (storeCustomer) {
    const metadata = storeCustomer.metadata || {};
    await input.supabase
      .from('store_customers')
      .update({
        name: input.customerInfo.name || null,
        phone: input.customerInfo.phone || null,
        total_orders: Number(storeCustomer.total_orders || 0) + 1,
        total_spent: Number(storeCustomer.total_spent || 0) + input.total,
        last_order_at: now,
        updated_at: now,
        metadata: {
          ...metadata,
          last_order_id: input.orderId,
          interests: [...new Set([...(metadata.interests || []), ...categories])],
          bargain_savings: input.bargainSavings,
        },
      })
      .eq('id', storeCustomer.id);

    return;
  }

  await input.supabase.from('store_customers').insert({
    merchant_id: input.merchantId,
    email: customerEmail,
    name: input.customerInfo.name || null,
    phone: input.customerInfo.phone || null,
    total_orders: 1,
    total_spent: input.total,
    last_order_at: now,
    metadata: {
      last_order_id: input.orderId,
      interests: categories,
      bargain_savings: input.bargainSavings,
    },
  });
}

export async function sendCashCheckoutNotifications(input: {
  supabase: SupabaseLike
  merchant: Merchant
  order: CheckoutOrderRecord
  customerInfo: Record<string, string>
  validatedCart: ValidatedCheckoutItem[]
  bargainedPrices?: BargainedPrice[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  currency: string
  paymentMethod: string
}) {
  const smtpConfig = {
    smtp_enabled: input.merchant.smtp_enabled,
    smtp_host: input.merchant.smtp_host,
    smtp_port: input.merchant.smtp_port,
    smtp_user: input.merchant.smtp_user,
    smtp_password: input.merchant.smtp_password,
    smtp_from_email: input.merchant.smtp_from_email,
    smtp_from_name: input.merchant.smtp_from_name,
  };

  if (input.merchant.low_stock_alerts_enabled && input.merchant.smtp_enabled) {
    const threshold = input.merchant.low_stock_threshold || 10;
    const { data: lowStockProducts } = await input.supabase
      .from('products')
      .select('name, sku, stock_quantity')
      .eq('merchant_id', input.merchant.id)
      .not('stock_quantity', 'is', null)
      .lte('stock_quantity', threshold);

    if (lowStockProducts && lowStockProducts.length > 0) {
      const merchantEmail = input.merchant.order_notification_email || input.merchant.store_email;
      if (merchantEmail) {
        sendLowStockAlertEmail({
          merchantEmail,
          storeName: input.merchant.store_name,
          products: lowStockProducts.map((product: { name: string; sku: string | null; stock_quantity: number }) => ({
            name: product.name,
            sku: product.sku,
            stock_quantity: product.stock_quantity,
            threshold,
          })),
        }, smtpConfig).catch((error) => logger.error('Failed to send low stock alert:', error));
      }
    }
  }

  const items = input.validatedCart.map((item) => {
    const bargainedPrice = (input.bargainedPrices || []).find((entry) => entry.product_id === item.id);
    return {
      name: item.name,
      quantity: item.quantity,
      price: bargainedPrice ? bargainedPrice.bargained_price : item.price,
    };
  });

  const merchantNotificationEmail = input.merchant.order_notification_email || input.merchant.store_email;
  if (merchantNotificationEmail && input.merchant.smtp_enabled) {
    sendNewOrderNotificationEmail({
      merchantEmail: merchantNotificationEmail,
      storeName: input.merchant.store_name,
      orderId: input.order.id,
      customerName: input.customerInfo?.name || 'Customer',
      customerEmail: input.customerInfo?.email || '',
      total: input.total,
      currency: input.currency.toUpperCase(),
      items,
      paymentMethod: input.paymentMethod,
    }, smtpConfig).catch((error) => logger.error('Failed to send merchant notification:', error));
  }

  if (input.customerInfo?.email && input.merchant.smtp_enabled && input.merchant.smtp_host) {
    sendOrderConfirmationEmail({
      orderId: input.order.id,
      customerName: input.customerInfo.name || 'Customer',
      customerEmail: input.customerInfo.email,
      storeName: input.merchant.store_name,
      items,
      subtotal: input.subtotal,
      shipping: input.shipping,
      tax: input.tax,
      total: input.total,
      currency: input.currency.toUpperCase(),
      shippingAddress: input.customerInfo.address ? {
        address: input.customerInfo.address,
        city: input.customerInfo.city || '',
        state: input.customerInfo.state || '',
        country: input.customerInfo.country || '',
        postalCode: input.customerInfo.pincode || input.customerInfo.postalCode || '',
      } : undefined,
    }, smtpConfig).catch((error) => logger.error('Failed to send order confirmation:', error));
  }
}

export async function createStorefrontStripeCheckoutSession(input: {
  merchant: Merchant
  subdomain: string
  customerInfo: Record<string, string>
  validatedCart: ValidatedCheckoutItem[]
  bargainedPrices?: BargainedPrice[]
  shipping: number
  tax: number
  taxRate: number
  taxName: string
  origin: string
  host: string
  orderId: string
  customerCountry: string
}) {
  const stripeConfig = input.merchant.payment_methods?.stripe as { enabled?: boolean; test_mode?: boolean; test_secret_key?: string; secret_key?: string } | undefined;
  if (!stripeConfig?.enabled) {
    throw new Error('Stripe is not configured for this store');
  }

  const isTestMode = stripeConfig.test_mode;
  const secretKey = isTestMode ? stripeConfig.test_secret_key : stripeConfig.secret_key;
  if (!secretKey) {
    throw new Error(`Stripe ${isTestMode ? 'test' : 'live'} secret key is missing. Please contact the merchant.`);
  }

  const stripe = new Stripe(secretKey);
  const currency = String(input.merchant.currency || 'usd').toLowerCase();
  const lineItems: CheckoutLineItem[] = input.validatedCart.map((item) => {
    const bargainedPrice = (input.bargainedPrices || []).find((entry) => entry.product_id === item.id);
    const itemPrice = bargainedPrice ? bargainedPrice.bargained_price : item.price;
    return {
      price_data: {
        currency,
        product_data: {
          name: bargainedPrice ? `${item.name} (Bargained Price!)` : item.name,
          images: item.image_url ? [item.image_url] : undefined,
        },
        unit_amount: Math.round(itemPrice * 100),
      },
      quantity: item.quantity,
    };
  });

  if (input.shipping > 0) {
    lineItems.push({
      price_data: {
        currency,
        product_data: { name: 'Shipping' },
        unit_amount: Math.round(input.shipping * 100),
      },
      quantity: 1,
    });
  }

  if (input.tax > 0) {
    lineItems.push({
      price_data: {
        currency,
        product_data: { name: `${input.taxName} (${input.taxRate}%)` },
        unit_amount: Math.round(input.tax * 100),
      },
      quantity: 1,
    });
  }

  const { successUrl, cancelUrl } = buildCheckoutReturnUrls({
    origin: input.origin,
    host: input.host,
    subdomain: input.subdomain,
    orderId: input.orderId,
  });

  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: input.customerInfo?.email || undefined,
    metadata: {
      order_id: input.orderId,
      merchant_id: input.merchant.id,
      subdomain: input.subdomain,
      test_mode: isTestMode ? 'true' : 'false',
      tax_rate: input.taxRate.toString(),
      tax_name: input.taxName,
      customer_country: input.customerCountry,
      has_bargained_items: input.bargainedPrices && input.bargainedPrices.length > 0 ? 'true' : 'false',
    },
    payment_intent_data: {
      metadata: {
        order_id: input.orderId,
        merchant_id: input.merchant.id,
        subdomain: input.subdomain,
        test_mode: isTestMode ? 'true' : 'false',
      },
    },
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'AU', 'IN', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CH', 'IE', 'NZ', 'JP', 'KR', 'SG', 'HK', 'AE', 'SA', 'ZA', 'BR', 'MX'],
    },
  });
}
