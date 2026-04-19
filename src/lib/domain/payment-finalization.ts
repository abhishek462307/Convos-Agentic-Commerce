import { finalizePaidOrder } from '@/lib/order-finalization';
import logger from '@/lib/logger';
import { sendPaidOrderNotifications } from '@/lib/domain/order-notifications';
import type { PaymentProvider } from '@/lib/domain/payment-providers';

type SupabaseLike = {
  from: (table: string) => any
};

export function asPaymentObject(value: any): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export async function updateOrderPaymentState(input: {
  supabase: SupabaseLike
  orderId: string
  merchantId: string
  status: string
  paymentDetails: Record<string, any>
}) {
  const { data: existingOrder } = await input.supabase
    .from('orders')
    .select('payment_details')
    .eq('id', input.orderId)
    .eq('merchant_id', input.merchantId)
    .single();

  await input.supabase
    .from('orders')
    .update({
      status: input.status,
      payment_details: {
        ...asPaymentObject(existingOrder?.payment_details),
        ...input.paymentDetails,
      },
    })
    .eq('id', input.orderId)
    .eq('merchant_id', input.merchantId);
}

export async function finalizeProviderPaidOrder(input: {
  supabase: SupabaseLike
  merchant: any
  orderId: string
  provider: PaymentProvider
  paymentDetails: Record<string, any>
  customerEmailOverride?: string | null
}) {
  await updateOrderPaymentState({
    supabase: input.supabase,
    orderId: input.orderId,
    merchantId: input.merchant.id,
    status: 'paid',
    paymentDetails: input.paymentDetails,
  });

  const finalization = await finalizePaidOrder({
    orderId: input.orderId,
    paymentMethod: input.provider,
  });

  if (!finalization.success) {
    logger.error(`${input.provider} payment finalization failed for ${input.orderId}: ${finalization.error}`);
    return {
      success: false,
      finalized: false,
      alreadyFinalized: false,
      error: finalization.error || 'Failed to finalize paid order',
    };
  }

  if (!finalization.alreadyFinalized && finalization.context) {
    await sendPaidOrderNotifications({
      merchant: input.merchant,
      order: finalization.context.order,
      items: finalization.context.items,
      paymentMethod: input.provider,
      customerEmailOverride: input.customerEmailOverride || null,
    });
  }

  return {
    success: true,
    finalized: !finalization.alreadyFinalized,
    alreadyFinalized: finalization.alreadyFinalized,
    context: finalization.context,
  };
}

export async function markProviderPaymentFailed(input: {
  supabase: SupabaseLike
  orderId: string
  merchantId: string
  paymentDetails: Record<string, any>
}) {
  await updateOrderPaymentState({
    supabase: input.supabase,
    orderId: input.orderId,
    merchantId: input.merchantId,
    status: 'payment_failed',
    paymentDetails: input.paymentDetails,
  });

  return { success: true };
}

export async function markProviderRefundState(input: {
  supabase: SupabaseLike
  orderId: string
  merchantId: string
  status: 'refunded' | 'partially_refunded'
  paymentDetails: Record<string, any>
}) {
  await updateOrderPaymentState({
    supabase: input.supabase,
    orderId: input.orderId,
    merchantId: input.merchantId,
    status: input.status,
    paymentDetails: input.paymentDetails,
  });

  return { success: true };
}
