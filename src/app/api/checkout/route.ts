import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import { resolvePaymentProviderConfig } from '@/lib/domain/payment-providers';
import {
  calculateCheckoutTotals,
  createStorefrontStripeCheckoutSession,
  createCheckoutOrderItems,
  createPendingCheckoutOrder,
  finalizeCashOnDeliveryOrder,
  fetchMerchantForCheckout,
  loadActiveCheckoutBargains,
  loadValidatedCheckoutContext,
  resolveCheckoutConversationId,
  resolveCheckoutDiscount,
  resolveCheckoutShipping,
  sanitizeCheckoutCart,
  sendCashCheckoutNotifications,
  syncCheckoutCustomerProfiles,
  buildCheckoutPaymentDetails,
  type TaxSettings,
} from '@/lib/domain/checkout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAIN_HOSTS = ['localhost', '127.0.0.1'];
function isMainDomain(host: string): boolean {
  const hostOnly = (host || '').split(':')[0].toLowerCase();
  return MAIN_HOSTS.includes(hostOnly) || hostOnly.endsWith('.vercel.app');
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = rateLimit(`checkout:${ip}`, { maxRequests: 10, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many checkout attempts. Please wait a moment.' }, { status: 429 });
    }

    const body = await request.json();
    logger.info('[Checkout API] Request body keys:', Object.keys(body), 'Payment method:', body.paymentMethod);
    const { subdomain, cart, customerInfo, conversationId, paymentMethod = 'cod', discountId, sessionId, aiAssisted, shippingRateId } = body;

    if (!subdomain || !cart || cart.length === 0) {
      logger.warn('[Checkout API] Missing subdomain or cart');
      return NextResponse.json(
        { error: 'Missing required fields: subdomain and cart' },
        { status: 400 }
      );
    }
    if (!customerInfo?.name || !customerInfo?.email || !customerInfo?.phone || !customerInfo?.address || !customerInfo?.city || !customerInfo?.country) {
      return NextResponse.json(
        { error: 'Missing required customer information' },
        { status: 400 }
      );
    }
    if (customerInfo?.country === 'IN' && !customerInfo?.state) {
      return NextResponse.json(
        { error: 'State is required for India' },
        { status: 400 }
      );
    }

    let merchant: any;
    try {
      merchant = await fetchMerchantForCheckout({
        supabase,
        subdomain,
      });
    } catch (merchantError: any) {
        logger.error('Merchant lookup failed:', { subdomain, error: merchantError });
        return NextResponse.json(
          { error: 'Merchant not found', details: merchantError?.message },
          { status: 404 }
        );
    }

    const paymentMethods = merchant.payment_methods || {};
    const taxSettings = (merchant.tax_settings as TaxSettings) || { enabled: false, default_rate: 0, include_in_price: false, country_rates: [] };
    const shippingPolicy = merchant.ai_shipping_policy || 'autonomous';
    if (aiAssisted === true && (shippingPolicy === 'disabled' || shippingPolicy === 'approval_required')) {
      return NextResponse.json(
        { error: shippingPolicy === 'disabled' ? 'Shipping selection is disabled for this store' : 'Shipping selection requires merchant approval' },
        { status: 403 }
      );
    }

    const currency = (merchant.currency || 'usd').toLowerCase();
    const customerCountry = customerInfo?.country || 'US';
    logger.info('[Checkout API] Merchant:', merchant.store_name, 'Currency:', currency, 'Country:', customerCountry);

    const sanitizedCart = sanitizeCheckoutCart(cart);

    if (sanitizedCart.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty or invalid' },
        { status: 400 }
      );
    }

    let validatedCart: any[] = [];
    let productMap = new Map<string, any>();
    let variantMap = new Map<string, any>();
    try {
      const validated = await loadValidatedCheckoutContext({
        supabase,
        merchantId: merchant.id,
        sanitizedCart,
      });
      validatedCart = validated.validatedCart;
      productMap = validated.productMap;
      variantMap = validated.variantMap;
    } catch (error: any) {
      const status = error?.message?.includes('out of stock') ? 409 : 400;
      return NextResponse.json(
        { error: error?.message || 'One or more products are unavailable' },
        { status }
      );
    }

    // Fetch active bargained prices for this session
    const bargainState = await loadActiveCheckoutBargains({
      supabase,
      merchantId: merchant.id,
      sessionId,
    });
    const bargainedPrices = bargainState.bargainedPrices;
    const hasBargainedItems = bargainState.hasBargainedItems;

    // Calculate subtotal with bargained prices applied
    const pricingSeed = calculateCheckoutTotals({
      validatedCart,
      bargainedPrices,
      shipping: 0,
      taxSettings,
      customerCountry,
    });
    const subtotal = pricingSeed.subtotal;
    const bargainSavings = pricingSeed.bargainSavings;
    
    // Handle Discount on Server Side - ONLY if no bargained items
    const appliedDiscount = await resolveCheckoutDiscount({
      supabase,
      merchantId: merchant.id,
      discountId,
      subtotal,
      hasBargainedItems,
    });

    const shippingResolution = await resolveCheckoutShipping({
      validatedCart,
      merchant,
      customerInfo,
      customerCountry,
      shippingRateId,
    });
    const shipping = shippingResolution.shipping;
    const shippingZoneName = shippingResolution.shippingZoneName;
    const shippingRateName = shippingResolution.shippingRateName;
    const pricing = calculateCheckoutTotals({
      validatedCart,
      bargainedPrices,
      appliedDiscount,
      shipping,
      taxSettings,
      customerCountry,
    });
    const discountAmount = pricing.discountAmount;
    const tax = pricing.tax;
    const taxRate = pricing.taxRate;
    const taxName = pricing.taxName;
    const total = pricing.total;
    const paymentDetails = buildCheckoutPaymentDetails({
      appliedDiscount,
      discountAmount,
      bargainedPrices,
      bargainSavings,
      hasBargainedItems,
      sessionId,
    });

      const validConversationId = await resolveCheckoutConversationId({
        supabase,
        conversationId,
      });

      const order = await createPendingCheckoutOrder({
        supabase,
        merchantId: merchant.id,
        conversationId: validConversationId,
        total,
        subtotal: subtotal - discountAmount,
        shipping,
        tax,
        customerInfo: {
          ...customerInfo,
          tax_applied: {
            rate: taxRate,
            name: taxName,
            amount: tax,
            country: customerCountry,
          },
          shipping_applied: {
            zone: shippingZoneName,
            rate_name: shippingRateName,
            amount: shipping,
          },
        },
        paymentMethod,
        paymentDetails,
        aiAssisted: !!(validConversationId || hasBargainedItems),
        aiNegotiated: hasBargainedItems,
        aiRevenueDelta: bargainSavings > 0 ? -bargainSavings : 0,
      });

    try {
      await createCheckoutOrderItems({
        supabase,
        orderId: order.id,
        merchantId: merchant.id,
        validatedCart,
        bargainedPrices,
      });
    } catch (itemsError) {
      logger.error('Order items error:', itemsError);
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    if (paymentMethod === 'cod') {
      try {
        await finalizeCashOnDeliveryOrder({
          supabase,
          orderId: order.id,
          merchantId: merchant.id,
          validatedCart,
          variantMap,
          productMap,
          appliedDiscount,
          sessionId,
        });
      } catch (error: any) {
        await supabase.from('order_items').delete().eq('order_id', order.id);
        await supabase.from('orders').delete().eq('id', order.id);
        if (error?.message === 'DISCOUNT_LIMIT_REACHED') {
          return NextResponse.json({ error: 'Discount code limit reached' }, { status: 409 });
        }
        return NextResponse.json(
          { error: 'Insufficient stock for one or more items' },
          { status: 409 }
        );
      }

      await syncCheckoutCustomerProfiles({
        supabase,
        merchantId: merchant.id,
        orderId: order.id,
        total,
        customerInfo,
        validatedCart,
        bargainSavings,
      });

      await sendCashCheckoutNotifications({
        supabase,
        merchant,
        order,
        customerInfo,
        validatedCart,
        bargainedPrices,
        subtotal,
        shipping,
        tax,
        total,
        currency,
        paymentMethod,
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        paymentMethod: 'cod',
        bargainSavings: bargainSavings > 0 ? bargainSavings : undefined
      });
    }

    if (paymentMethod === 'stripe') {
      try {
        const session = await createStorefrontStripeCheckoutSession({
          merchant,
          subdomain,
          customerInfo,
          validatedCart,
          bargainedPrices,
          shipping,
          tax,
          taxRate,
          taxName,
          origin: request.headers.get('origin') || '',
          host: request.headers.get('host') || '',
          orderId: order.id,
          customerCountry,
        });

        return NextResponse.json({
          url: session.url,
          sessionId: session.id,
          orderId: order.id,
          bargainSavings: bargainSavings > 0 ? bargainSavings : undefined
        });
      } catch (error: any) {
        logger.error('[Checkout API] Stripe session creation failed:', error);
        return NextResponse.json(
          { error: error?.message || 'Stripe is not configured for this store' },
          { status: 400 }
        );
      }
    }

    if (paymentMethod === 'razorpay') {
      const razorpayConfig = resolvePaymentProviderConfig({ payment_methods: paymentMethods }, 'razorpay');
      if (!razorpayConfig.enabled) {
        return NextResponse.json(
          { error: 'Razorpay is not configured for this store' },
          { status: 400 }
        );
      }

      const keyId = razorpayConfig.publicKey;
      const keySecret = razorpayConfig.secretKey;

      if (!keyId || !keySecret) {
        return NextResponse.json(
          { error: `Razorpay ${razorpayConfig.testMode ? 'test' : 'live'} credentials are missing` },
          { status: 400 }
        );
      }

      const rzpOrderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        },
        body: JSON.stringify({
          amount: Math.round(total * 100),
          currency: currency.toUpperCase(),
          receipt: order.id,
          notes: { order_id: order.id, merchant_id: merchant.id },
        }),
      });

      if (!rzpOrderRes.ok) {
        const rzpErr = await rzpOrderRes.text();
        logger.error('Razorpay order creation failed:', rzpErr);
        return NextResponse.json(
          { error: 'Failed to create Razorpay order' },
          { status: 500 }
        );
      }

      const rzpOrder = await rzpOrderRes.json();

      await supabase
        .from('orders')
        .update({ payment_details: { ...paymentDetails, razorpay_order_id: rzpOrder.id } })
        .eq('id', order.id);

      return NextResponse.json({
        razorpay: true,
        orderId: order.id,
        razorpay_order_id: rzpOrder.id,
        key_id: keyId,
        amount: Math.round(total * 100),
        currency: currency.toUpperCase(),
        name: merchant.store_name,
        prefill: {
          name: customerInfo?.name,
          email: customerInfo?.email,
          contact: customerInfo?.phone
        },
        bargainSavings: bargainSavings > 0 ? bargainSavings : undefined
      });
    }

    if (paymentMethod === 'paypal') {
      const paypalConfig = resolvePaymentProviderConfig({ payment_methods: paymentMethods }, 'paypal');
      if (!paypalConfig.enabled) {
        return NextResponse.json(
          { error: 'PayPal is not configured for this store' },
          { status: 400 }
        );
      }

      const clientId = paypalConfig.publicKey;
      const clientSecret = paypalConfig.secretKey;

      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: `PayPal ${paypalConfig.testMode ? 'sandbox' : 'live'} credentials are missing` },
          { status: 400 }
        );
      }

      const paypalBase = paypalConfig.testMode
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com';

      const tokenRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenRes.ok) {
        logger.error('PayPal token fetch failed:', await tokenRes.text());
        return NextResponse.json({ error: 'Failed to authenticate with PayPal' }, { status: 500 });
      }

      const tokenBody = await tokenRes.json();
      const access_token = tokenBody.access_token;
      if (!access_token) {
        logger.error('PayPal token response missing access_token:', JSON.stringify(tokenBody));
        return NextResponse.json({ error: 'PayPal authentication returned no access token' }, { status: 500 });
      }

      const origin = request.headers.get('origin') || '';
      const host = request.headers.get('host') || '';
      const baseUrl = origin || `https://${host}`;
      const returnPath = isMainDomain(host) ? `/store/${subdomain}/checkout` : '/checkout';

      const ppOrderRes = await fetch(`${paypalBase}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: order.id,
            amount: {
              currency_code: currency.toUpperCase(),
              value: total.toFixed(2),
            },
            description: `Order from ${merchant.store_name}`,
          }],
          application_context: {
            return_url: `${baseUrl}${returnPath}?success=true&order_id=${order.id}&provider=paypal`,
            cancel_url: `${baseUrl}${returnPath}?canceled=true&order_id=${order.id}`,
            brand_name: merchant.store_name,
            user_action: 'PAY_NOW',
          },
        }),
      });

      if (!ppOrderRes.ok) {
        const ppErr = await ppOrderRes.text();
        logger.error('PayPal order creation failed:', ppErr);
        return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 });
      }

      const ppOrder = await ppOrderRes.json();
      const approvalLink = ppOrder.links?.find((l: any) => l.rel === 'approve')?.href;

      if (!approvalLink) {
        return NextResponse.json({ error: 'PayPal did not return an approval URL' }, { status: 500 });
      }

      const { error: ppUpdateError } = await supabase
        .from('orders')
        .update({ payment_details: { ...paymentDetails, paypal_order_id: ppOrder.id } })
        .eq('id', order.id);

      if (ppUpdateError) {
        logger.error('Failed to update PayPal payment_details for order', order.id, 'ppOrder', ppOrder.id, ppUpdateError);
        return NextResponse.json({ error: 'Failed to save payment details' }, { status: 500 });
      }

      return NextResponse.json({
        url: approvalLink,
        orderId: order.id,
        paypal_order_id: ppOrder.id,
        bargainSavings: bargainSavings > 0 ? bargainSavings : undefined,
      });
    }

    return NextResponse.json(
      { error: 'Invalid payment method' },
      { status: 400 }
    );

  } catch (err: any) {
    logger.error('Checkout error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
