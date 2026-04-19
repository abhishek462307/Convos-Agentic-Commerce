import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';
import { resolvePaymentProviderConfig } from '@/lib/domain/payment-providers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function summarizePurchaseUnits(units: unknown): string {
  if (!Array.isArray(units)) return 'no_purchase_units';
  return JSON.stringify(
    units.map((u: Record<string, unknown>, i: number) => ({
      index: i,
      reference_id: u.reference_id ?? null,
      captureCount: Array.isArray((u.payments as Record<string, unknown>)?.captures)
        ? ((u.payments as Record<string, unknown>).captures as unknown[]).length
        : 0,
    }))
  );
}

async function updateOrderWithRetry(
  orderId: string,
  paymentDetails: Record<string, unknown>,
  maxRetries = 3
): Promise<{ error: unknown | null }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'paid', payment_details: paymentDetails })
      .eq('id', orderId)
      .eq('status', 'pending');
    if (!error) return { error: null };
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 200 * attempt));
    } else {
      return { error };
    }
  }
  return { error: new Error('updateOrderWithRetry: unreachable') };
}

export async function POST(request: Request) {
  try {
    const { orderId, paypalOrderId } = await request.json();

    if (!orderId || !paypalOrderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, merchant_id, status, payment_method, payment_details, total')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.payment_method !== 'paypal') {
      return NextResponse.json({ error: 'Order is not a PayPal order' }, { status: 400 });
    }

    if (order.status === 'paid' || order.status === 'confirmed') {
      const storedPaypalId = order.payment_details?.paypal_order_id;
      if (storedPaypalId && storedPaypalId !== paypalOrderId) {
        return NextResponse.json({ success: false, error: 'paypal_order_id_mismatch' }, { status: 400 });
      }
      return NextResponse.json({ success: true, already_captured: true });
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, payment_methods')
      .eq('id', order.merchant_id)
      .single();

    if (merchantError) {
      logger.error('Merchant query failed for order', orderId, merchantError);
      return NextResponse.json({ error: 'Failed to look up merchant' }, { status: 500 });
    }

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const paypalConfig = resolvePaymentProviderConfig(merchant, 'paypal');
    if (!paypalConfig.publicKey || !paypalConfig.secretKey) {
      return NextResponse.json({ error: 'PayPal credentials missing' }, { status: 400 });
    }

    const paypalBase = paypalConfig.testMode
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    const tokenRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${paypalConfig.publicKey}:${paypalConfig.secretKey}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      logger.error('PayPal token fetch failed during capture');
      return NextResponse.json({ error: 'PayPal authentication failed' }, { status: 500 });
    }

    const { access_token } = await tokenRes.json();

    const captureRes = await fetch(`${paypalBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!captureRes.ok) {
      const captureErr = await captureRes.text();
      logger.error('PayPal capture failed:', captureErr);
      return NextResponse.json({ error: 'Payment capture failed' }, { status: 400 });
    }

    const captureData = await captureRes.json();

    if (captureData.status !== 'COMPLETED') {
      return NextResponse.json({ error: `Payment not completed. Status: ${captureData.status}` }, { status: 400 });
    }

    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    if (!captureId) {
      logger.error('PayPal capture response missing capture id for order', orderId, 'paypalOrder', paypalOrderId, summarizePurchaseUnits(captureData.purchase_units));
      return NextResponse.json({ error: 'PayPal capture did not return a capture ID' }, { status: 500 });
    }

    const updatedDetails = {
      ...order.payment_details,
      paypal_order_id: paypalOrderId,
      paypal_capture_id: captureId,
      paypal_status: 'COMPLETED',
    };

    const { error: updateError } = await updateOrderWithRetry(orderId, updatedDetails);

    if (updateError) {
      logger.error('CRITICAL: PayPal captured but order update failed after retries', { orderId, paypalOrderId, captureId, error: updateError });
      return NextResponse.json(
        { success: false, paymentCaptured: true, orderUpdatePending: true, orderId, paypalOrderId, captureId, error: 'Payment captured but order update failed — will be reconciled' },
        { status: 202 }
      );
    }

    return NextResponse.json({ success: true, captureId });
  } catch (error: any) {
    logger.error('PayPal verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
