import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { resolvePaymentProviderConfig } from '@/lib/domain/payment-providers';

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

export interface StripeCheckoutCartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
  variant_id?: string | null
  variant_name?: string | null
}

interface BargainedItem {
  product_id: string
  original_price?: number
  bargained_price: number
  discount_percentage?: number
}

interface CreateStripeOrderCheckoutSessionInput {
  merchant: any
  subdomain: string
  customerInfo: Record<string, any>
  validatedCart: StripeCheckoutCartItem[]
  paymentDetails?: Record<string, any>
  shipping?: number
  tax?: number
  taxRate?: number
  taxName?: string
  source: string
  successUrlBase: string
  cancelUrlBase?: string
  reserveInventory?: boolean
  stripeSecretKeyOverride?: string | null
  stripeMetadata?: Record<string, string>
  aiAssisted?: boolean
  aiNegotiated?: boolean
  aiRevenueDelta?: number
  bargainedItems?: BargainedItem[]
}

function getStripeSecretKey(merchant: any, override?: string | null) {
  if (override) {
    return override;
  }

  const stripeConfig = resolvePaymentProviderConfig(merchant, 'stripe');
  if (!stripeConfig.enabled) {
    throw new Error('Stripe is not enabled for this store');
  }

  const secretKey = stripeConfig.secretKey;
  if (!secretKey) {
    throw new Error(`Stripe ${stripeConfig.testMode ? 'test' : 'live'} secret key is missing`);
  }

  return secretKey;
}

function buildLineItems(input: {
  validatedCart: StripeCheckoutCartItem[]
  bargainedItems: BargainedItem[]
  currency: string
  shipping: number
  tax: number
  taxRate: number
  taxName: string
}) {
  const lineItems: CheckoutLineItem[] = input.validatedCart.map((item) => {
    const bargainedPrice = input.bargainedItems.find((entry) => entry.product_id === item.id);
    const itemPrice = bargainedPrice ? bargainedPrice.bargained_price : item.price;
    const name = item.variant_name ? `${item.name} (${item.variant_name})` : item.name;
    return {
      price_data: {
        currency: input.currency,
        product_data: {
          name: bargainedPrice ? `${name} (Bargained!)` : name,
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
        currency: input.currency,
        product_data: { name: 'Shipping' },
        unit_amount: Math.round(input.shipping * 100),
      },
      quantity: 1,
    });
  }

  if (input.tax > 0) {
    lineItems.push({
      price_data: {
        currency: input.currency,
        product_data: { name: `${input.taxName} (${input.taxRate}%)` },
        unit_amount: Math.round(input.tax * 100),
      },
      quantity: 1,
    });
  }

  return lineItems;
}

async function reserveInventory(validatedCart: StripeCheckoutCartItem[]) {
  const variantIds = Array.from(new Set(validatedCart.map((item) => item.variant_id).filter(Boolean))) as string[];
  const productIds = Array.from(new Set(validatedCart.map((item) => item.id).filter(Boolean)));
  const variantMap = new Map<string, any>();
  const productMap = new Map<string, any>();
  const decrementedInventory: Array<{ type: 'product' | 'variant'; id: string; previousStock: number }> = [];

  if (variantIds.length > 0) {
    const { data: variants } = await supabaseAdmin
      .from('product_variants')
      .select('id, product_id, stock_quantity, name')
      .in('id', variantIds);
    (variants || []).forEach((variant: any) => variantMap.set(variant.id, variant));
  }

  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, stock_quantity, track_quantity')
      .in('id', productIds);
    (products || []).forEach((product: any) => productMap.set(product.id, product));
  }

  for (const item of validatedCart) {
    if (item.variant_id) {
      const variant = variantMap.get(item.variant_id);
      if (variant && variant.stock_quantity !== null) {
        if (Number(variant.stock_quantity) < item.quantity) {
          throw new Error(`${item.name} is out of stock`);
        }

        const newStock = Math.max(0, Number(variant.stock_quantity) - item.quantity);
        await supabaseAdmin
          .from('product_variants')
          .update({ stock_quantity: newStock })
          .eq('id', item.variant_id);
        decrementedInventory.push({ type: 'variant', id: item.variant_id, previousStock: Number(variant.stock_quantity) });
        continue;
      }
    }

    const product = productMap.get(item.id);
    if (product && (product.track_quantity ?? true) && product.stock_quantity !== null) {
      if (Number(product.stock_quantity) < item.quantity) {
        throw new Error(`${item.name} is out of stock`);
      }

      const newStock = Math.max(0, Number(product.stock_quantity) - item.quantity);
      await supabaseAdmin
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', item.id);
      decrementedInventory.push({ type: 'product', id: item.id, previousStock: Number(product.stock_quantity) });
    }
  }

  return decrementedInventory;
}

async function rollbackCheckoutArtifacts(orderId: string, decrementedInventory: Array<{ type: 'product' | 'variant'; id: string; previousStock: number }>) {
  for (const item of [...decrementedInventory].reverse()) {
    if (item.type === 'variant') {
      await supabaseAdmin.from('product_variants').update({ stock_quantity: item.previousStock }).eq('id', item.id);
    } else {
      await supabaseAdmin.from('products').update({ stock_quantity: item.previousStock }).eq('id', item.id);
    }
  }

  await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);
  await supabaseAdmin.from('orders').delete().eq('id', orderId);
}

export async function createStripeOrderCheckoutSession(input: CreateStripeOrderCheckoutSessionInput) {
  const shipping = Number(input.shipping || 0);
  const tax = Number(input.tax || 0);
  const taxRate = Number(input.taxRate || 0);
  const taxName = input.taxName || 'Tax';
  const bargainedItems = input.bargainedItems || [];
  const currency = String(input.merchant.currency || 'USD').toLowerCase();
  const subtotal = input.validatedCart.reduce((acc, item) => {
    const bargained = bargainedItems.find((entry) => entry.product_id === item.id);
    const itemPrice = bargained ? Number(bargained.bargained_price) : Number(item.price);
    return acc + itemPrice * item.quantity;
  }, 0);
  const total = subtotal + shipping + tax;
  const stripeSecretKey = getStripeSecretKey(input.merchant, input.stripeSecretKeyOverride);
  const stripe = new Stripe(stripeSecretKey);
  const decrementedInventory: Array<{ type: 'product' | 'variant'; id: string; previousStock: number }> = [];

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert([{
      merchant_id: input.merchant.id,
      total_amount: total,
      subtotal,
      shipping_amount: shipping,
      tax_amount: tax,
      customer_info: {
        ...input.customerInfo,
        tax_applied: { rate: taxRate, name: taxName, amount: tax, country: input.customerInfo.country || 'US' },
        shipping_applied: { amount: shipping },
      },
      status: 'pending',
      payment_method: 'stripe',
      payment_details: {
        ...(input.paymentDetails || {}),
        source: input.source,
      },
      ai_assisted: input.aiAssisted ?? false,
      ai_negotiated: input.aiNegotiated ?? false,
      ai_revenue_delta: input.aiRevenueDelta ?? 0,
    }])
    .select()
    .single();

  if (orderError || !order) {
    throw orderError || new Error('Failed to create order');
  }

  try {
    const orderItems = input.validatedCart.map((item) => {
      const bargained = bargainedItems.find((entry) => entry.product_id === item.id);
      return {
        order_id: order.id,
        merchant_id: input.merchant.id,
        product_id: item.id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        price_at_purchase: bargained ? bargained.bargained_price : item.price,
      };
    });

    const { error: orderItemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (orderItemsError) {
      throw new Error('Failed to create order items');
    }

    if (input.reserveInventory) {
      decrementedInventory.push(...await reserveInventory(input.validatedCart));
    }

    const lineItems = buildLineItems({
      validatedCart: input.validatedCart,
      bargainedItems,
      currency,
      shipping,
      tax,
      taxRate,
      taxName,
    });

    const successUrl = `${input.successUrlBase}?success=true&order_id=${order.id}`;
    const cancelUrlBase = input.cancelUrlBase || input.successUrlBase;
    const cancelUrl = `${cancelUrlBase}?canceled=true&order_id=${order.id}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: input.customerInfo.email,
      metadata: {
        order_id: order.id,
        merchant_id: input.merchant.id,
        subdomain: input.subdomain,
        source: input.source,
        ...(input.stripeMetadata || {}),
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          merchant_id: input.merchant.id,
          subdomain: input.subdomain,
          ...(input.stripeMetadata || {}),
        },
      },
    });

    return {
      order,
      session,
      total,
      subtotal,
      currency: currency.toUpperCase(),
    };
  } catch (error) {
    await rollbackCheckoutArtifacts(order.id, decrementedInventory);
    throw error;
  }
}
