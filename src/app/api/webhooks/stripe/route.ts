import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { processMerchantStripeEvent } from '@/lib/domain/stripe-webhooks';
import { resolvePaymentProviderConfig } from '@/lib/domain/payment-providers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getMerchantWebhookSecret(
  merchantId?: string,
  orderId?: string
): Promise<{ merchant: any; webhookSecret: string; secretKey: string } | null> {
  let merchant = null;

  if (merchantId) {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, payment_methods, store_name, currency, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, store_email, order_notification_email')
        .eq('id', merchantId)
        .single();
    
    if (!error && data) merchant = data;
  }

  if (!merchant && orderId) {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('merchant_id')
      .eq('id', orderId)
      .single();

    if (!orderError && order?.merchant_id) {
      const { data, error } = await supabase
          .from('merchants')
          .select('id, payment_methods, store_name, currency, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, store_email, order_notification_email')
          .eq('id', order.merchant_id)
          .single();
      
      if (!error && data) merchant = data;
    }
  }

  if (!merchant) return null;

  const stripeConfig = resolvePaymentProviderConfig(merchant, 'stripe');
  if (!stripeConfig.enabled) return null;

  const webhookSecret = stripeConfig.webhookSecret;
  const secretKey = stripeConfig.secretKey;

  if (!webhookSecret || !secretKey) return null;

  return { merchant, webhookSecret, secretKey };
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    let preliminaryEvent: Stripe.Event;
    try {
      preliminaryEvent = JSON.parse(body) as Stripe.Event;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const eventData = preliminaryEvent.data?.object as any;
    const metadata = eventData?.metadata || {};
    const merchantId = metadata.merchant_id;
    const orderId = metadata.order_id;

    if (!merchantId && !orderId) {
      return NextResponse.json(
        { error: 'Missing merchant_id or order_id in metadata' },
        { status: 400 }
      );
    }

    const merchantInfo = await getMerchantWebhookSecret(merchantId, orderId);
    if (!merchantInfo) {
      return NextResponse.json(
        { error: 'Could not retrieve merchant webhook configuration' },
        { status: 400 }
      );
    }

    const { merchant, webhookSecret, secretKey } = merchantInfo;

      const stripe = new Stripe(secretKey);

    let verifiedEvent: Stripe.Event;
    try {
      verifiedEvent = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      logger.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    logger.info(`[Webhook] Processing ${verifiedEvent.type} for merchant ${merchant.id}`);
    await processMerchantStripeEvent({
      supabase,
      merchant,
      event: verifiedEvent,
    });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error('Webhook error:', err);
    return NextResponse.json(
      { error: err.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
