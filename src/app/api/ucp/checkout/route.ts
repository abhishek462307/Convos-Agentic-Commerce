import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/ucp-utils';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';
import { createStripeOrderCheckoutSession } from '@/lib/domain/stripe-checkout';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const defaultStripeKey = process.env.STRIPE_SECRET_KEY!;

export async function POST(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const merchant = await getMerchantFromRequest(host);

  if (!merchant) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const body = await request.json();
  const { product_id, quantity = 1, price: negotiated_price, customer_email } = body;

  if (!product_id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // 1. Fetch product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', product_id)
    .eq('merchant_id', merchant.id)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // 2. Validate price if negotiated
  let finalPrice = product.price;
  if (negotiated_price) {
    if (product.bargain_enabled && negotiated_price >= product.bargain_min_price) {
      finalPrice = negotiated_price;
    } else if (!product.bargain_enabled && negotiated_price !== product.price) {
       return NextResponse.json({ error: 'Price negotiation not enabled for this product' }, { status: 403 });
    } else if (negotiated_price < product.bargain_min_price) {
       return NextResponse.json({ error: 'Negotiated price below floor price' }, { status: 403 });
    }
  }

  // 3. Determine Stripe Key
  const merchantStripeKey = merchant.payment_methods?.stripe?.secret_key;
  const stripeSecretKey = merchantStripeKey || defaultStripeKey;

  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;
  const checkoutPath = merchant.custom_domain && merchant.domain_verified
    ? '/checkout'
    : `/store/${merchant.subdomain}/checkout`;

  try {
    const checkout = await createStripeOrderCheckoutSession({
      merchant,
      subdomain: merchant.subdomain,
      customerInfo: { email: customer_email },
      validatedCart: [{
        id: product.id,
        name: product.name,
        price: finalPrice,
        quantity,
        image_url: product.image_url || null,
      }],
      paymentDetails: { source: 'ucp_agent' },
      shipping: 0,
      tax: 0,
      source: 'ucp_agent',
      successUrlBase: `${baseUrl}${checkoutPath}`,
      cancelUrlBase: `${baseUrl}${checkoutPath}`,
      reserveInventory: false,
      stripeSecretKeyOverride: stripeSecretKey,
      stripeMetadata: {
        product_id: product.id,
        negotiated: negotiated_price ? 'true' : 'false',
        ucp_checkout: 'true',
      },
      aiAssisted: true,
    });

    // 6. Return UCP standardized checkout handshake
    return NextResponse.json({
      status: 'initiated',
      checkout_id: checkout.session.id,
      payment_url: checkout.session.url,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      methods: ['stripe_checkout'],
      details: {
        total: {
          amount: checkout.total,
          currency: merchant.currency || 'USD',
        },
        items: [{
          id: product.id,
          name: product.name,
          quantity: quantity,
          price: finalPrice
        }]
      }
    });

  } catch (stripeError: any) {
    logger.error('Stripe error:', stripeError);
    return NextResponse.json({ error: stripeError.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
