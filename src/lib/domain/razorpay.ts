import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  asPaymentObject,
  finalizeProviderPaidOrder,
  markProviderPaymentFailed,
} from '@/lib/domain/payment-finalization';
import { resolvePaymentProviderConfig } from '@/lib/domain/payment-providers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function computeRazorpayExpectedSignature(input: {
  orderId: string
  paymentId: string
  keySecret: string
}) {
  return crypto
    .createHmac('sha256', input.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');
}

export async function verifyAndFinalizeRazorpayPayment(input: {
  orderId: string
  razorpayPaymentId: string
  razorpayOrderId: string
  razorpaySignature: string
}) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      payment_method,
      payment_details,
      customer_info,
      subtotal,
      shipping_amount,
      tax_amount,
      total_amount,
      merchants!inner(
        id,
        store_name,
        currency,
        payment_methods,
        smtp_enabled,
        smtp_host,
        smtp_port,
        smtp_user,
        smtp_password,
        smtp_from_email,
        smtp_from_name,
        store_email,
        order_notification_email
      )
    `)
    .eq('id', input.orderId)
    .single();

  if (orderError || !order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  if (order.payment_method !== 'razorpay') {
    throw new Error('INVALID_PAYMENT_METHOD');
  }

  const merchant = Array.isArray(order.merchants) ? order.merchants[0] : order.merchants;
  if (!merchant) {
    throw new Error('MERCHANT_NOT_FOUND');
  }

  const paymentDetails = asPaymentObject(order.payment_details);
  const expectedOrderId = paymentDetails.razorpay_order_id;
  if (expectedOrderId && expectedOrderId !== input.razorpayOrderId) {
    await markProviderPaymentFailed({
      supabase,
      orderId: input.orderId,
      merchantId: merchant.id,
      paymentDetails: {
        razorpay_payment_id: input.razorpayPaymentId,
        razorpay_order_id: input.razorpayOrderId,
        payment_status: 'failed',
        verification_error: 'Razorpay order id mismatch',
        verified_at: new Date().toISOString(),
      },
    });
    throw new Error('PAYMENT_VERIFICATION_FAILED');
  }

  const razorpayConfig = resolvePaymentProviderConfig(merchant, 'razorpay');
  const keySecret = razorpayConfig.secretKey;
  if (!keySecret) {
    throw new Error('RAZORPAY_SECRET_MISSING');
  }

  const expectedSignature = computeRazorpayExpectedSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    keySecret,
  });

  if (expectedSignature !== input.razorpaySignature) {
    await markProviderPaymentFailed({
      supabase,
      orderId: input.orderId,
      merchantId: merchant.id,
      paymentDetails: {
        razorpay_payment_id: input.razorpayPaymentId,
        razorpay_order_id: input.razorpayOrderId,
        payment_status: 'failed',
        verification_error: 'Signature mismatch',
        verified_at: new Date().toISOString(),
      },
    });
    throw new Error('PAYMENT_VERIFICATION_FAILED');
  }

  const finalization = await finalizeProviderPaidOrder({
    supabase,
    merchant,
    orderId: input.orderId,
    provider: 'razorpay',
    paymentDetails: {
      razorpay_payment_id: input.razorpayPaymentId,
      razorpay_order_id: input.razorpayOrderId,
      razorpay_signature: input.razorpaySignature,
      payment_status: 'paid',
      verified_at: new Date().toISOString(),
    },
  });

  if (!finalization.success) {
    return {
      success: true,
      finalizationPending: true,
    };
  }

  return {
    success: true,
    finalizationPending: false,
  };
}
