import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';
import { createStripeOrderCheckoutSession } from '@/lib/domain/stripe-checkout';
import { sanitizeCheckoutCart } from '@/lib/domain/checkout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getBargainedPrice = (value: any) => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof value.bargainedPrice === 'number') return value.bargainedPrice;
  return null;
};

export async function POST(req: Request) {
  try {
    const { subdomain, cart, customerInfo, sessionId, bargainedPrices } = await req.json();

    if (!cart || cart.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!customerInfo?.email) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    const { data: merchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('subdomain', subdomain)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const sanitizedCart = sanitizeCheckoutCart(cart).map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      variantId: item.variant?.id || item.variant_id || item.variantId || null,
    }));

    if (sanitizedCart.length === 0) {
      return NextResponse.json({ error: 'Cart is empty or invalid' }, { status: 400 });
    }

    const productIds = Array.from(new Set(sanitizedCart.map((item: any) => item.id)));
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, track_quantity, image_url, bargain_enabled, bargain_min_price')
      .eq('merchant_id', merchant.id)
      .in('id', productIds);

    if (productsError || !products || products.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products are unavailable' }, { status: 400 });
    }

    const variantIds = Array.from(new Set(sanitizedCart.map((item: any) => item.variantId).filter(Boolean)));
    const variantMap = new Map<string, any>();
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, product_id, price, stock_quantity, name')
        .in('id', variantIds);
      (variants || []).forEach((variant: any) => variantMap.set(variant.id, variant));
    }

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const validatedCart: any[] = [];
    for (const item of sanitizedCart) {
      const product = productMap.get(item.id);
      if (!product) {
        return NextResponse.json({ error: 'One or more products are unavailable' }, { status: 400 });
      }

      const variantId = item.variantId;
      const variant = variantId ? variantMap.get(variantId) : null;
      if (variantId && (!variant || variant.product_id !== product.id)) {
        return NextResponse.json({ error: 'Selected variant is unavailable' }, { status: 400 });
      }

      if (variant && variant.stock_quantity !== null && variant.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `${product.name} is out of stock` }, { status: 409 });
      }
      if ((product.track_quantity ?? true) && product.stock_quantity !== null && product.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `${product.name} is out of stock` }, { status: 409 });
      }

      validatedCart.push({
        id: product.id,
        name: product.name,
        image_url: product.image_url,
        price: variant?.price ?? product.price,
        quantity: item.quantity,
        variant_id: variant?.id || null,
        variant_name: variant?.name || null,
        bargain_enabled: product.bargain_enabled,
        bargain_min_price: product.bargain_min_price
      });
    }

    const paymentMethods = merchant.payment_methods || {};
    const stripeConfig = paymentMethods.stripe;
    if (!stripeConfig?.enabled) {
      return NextResponse.json({ error: 'Stripe is not enabled for this store' }, { status: 400 });
    }

    const isTestMode = stripeConfig.test_mode;
    const secretKey = isTestMode ? stripeConfig.test_secret_key : stripeConfig.secret_key;

    if (!secretKey) {
      return NextResponse.json({ error: `Stripe ${isTestMode ? 'test' : 'live'} secret key is missing` }, { status: 400 });
    }

    const shippingPolicy = merchant.ai_shipping_policy || 'autonomous';
    if (shippingPolicy === 'disabled') {
      return NextResponse.json({ error: 'Shipping selection is disabled for this store' }, { status: 403 });
    }
    if (shippingPolicy === 'approval_required') {
      await supabaseAdmin.from('ai_decision_log').insert({
        merchant_id: merchant.id,
        session_id: sessionId || null,
        consumer_email: customerInfo?.email || null,
        decision_type: 'shipping_selected',
        summary: 'Shipping requires merchant approval',
        human_summary: 'Shipping requires merchant approval',
        factors: {
          policy: 'approval_required',
          action: 'payment_link',
          subdomain,
          cart: validatedCart,
          customerInfo,
          bargainedPrices: bargainedPrices || null
        },
        outcome: { status: 'pending', reason: 'requires_approval' },
        tool_called: 'generate_payment_link'
      });
      return NextResponse.json({ error: 'Shipping selection requires merchant approval' }, { status: 403 });
    }

    const resolvedBargains = new Map<string, number>();
    if (bargainedPrices && typeof bargainedPrices === 'object') {
      for (const item of validatedCart) {
        const raw = (bargainedPrices as any)[item.id];
        if (raw === undefined) continue;
        const bargainedPrice = getBargainedPrice(raw);
        if (!Number.isFinite(bargainedPrice)) {
          return NextResponse.json({ error: 'Invalid bargained price' }, { status: 400 });
        }
        if (!item.bargain_enabled || !item.bargain_min_price) {
          return NextResponse.json({ error: 'Bargained price not allowed for one or more items' }, { status: 400 });
        }
        if (bargainedPrice < item.bargain_min_price || bargainedPrice > item.price) {
          return NextResponse.json({ error: 'Invalid bargained price' }, { status: 400 });
        }
        resolvedBargains.set(item.id, bargainedPrice);
      }
    }

    const subtotal = validatedCart.reduce((acc: number, item: any) => {
      const itemPrice = resolvedBargains.get(item.id) ?? item.price;
      return acc + (itemPrice * item.quantity);
    }, 0);

    const shippingSettings = merchant.shipping_settings || { zones: [] };
    const customerCountry = customerInfo.country || 'US';
    let shipping = 0;

    if (shippingSettings.zones?.length > 0) {
      const matchingZone = shippingSettings.zones.find((zone: any) =>
        zone.countries?.includes(customerCountry)
      );
      if (matchingZone?.rates?.[0]) {
        shipping = matchingZone.rates[0].price;
      } else if (shippingSettings.zones[0]?.rates?.[0]) {
        shipping = shippingSettings.zones[0].rates[0].price;
      }
    } else {
      shipping = subtotal > 100 ? 0 : 15;
    }

    const taxSettings = merchant.tax_settings || { enabled: false, default_rate: 0 };
    let tax = 0;
    let taxRate = 0;
    let taxName = 'Tax';

    if (taxSettings.enabled) {
      const countryRate = taxSettings.country_rates?.find((c: any) => c.country_code === customerCountry);
      taxRate = countryRate?.rate || taxSettings.default_rate || 0;
      taxName = countryRate?.tax_name || 'Tax';
      if (taxRate > 0) {
        tax = subtotal * (taxRate / 100);
      }
    }

    const bargainedItems = Array.from(resolvedBargains.entries()).map(([productId, price]) => ({
      product_id: productId,
      bargained_price: price
    }));
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkout = await createStripeOrderCheckoutSession({
      merchant,
      subdomain,
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
      successUrlBase: `${baseUrl}/store/${subdomain}/checkout`,
      cancelUrlBase: `${baseUrl}/store/${subdomain}/checkout`,
      reserveInventory: true,
      stripeSecretKeyOverride: secretKey,
      bargainedItems,
    });

    return NextResponse.json({
      success: true,
      paymentUrl: checkout.session.url,
      orderId: checkout.order.id,
      total: checkout.total,
      currency: checkout.currency
    });

  } catch (error: any) {
    logger.error('Payment link error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
