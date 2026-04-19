import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { resolvePaymentProviderConfig } from '@/lib/domain/payment-providers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProcessOrderRefundInput {
  orderId: string
  actorType: 'user' | 'agent' | 'system'
  actorEmail?: string | null
  reason?: string | null
}

export async function processOrderRefund(input: ProcessOrderRefundInput) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, merchants(*)')
    .eq('id', input.orderId)
    .single();

  if (orderError || !order) {
    throw new Error('Order not found');
  }

  if (order.status === 'refunded') {
    return { success: true, alreadyRefunded: true, attentionRequired: false };
  }

  if (order.status === 'refund_pending') {
    throw new Error('Refund is already in progress');
  }

  const paymentDetails = order.payment_details || {};
  const previousStatus = order.status;

  const { data: pendingOrder, error: markPendingError } = await supabase
    .from('orders')
    .update({
      status: 'refund_pending',
      payment_details: {
        ...paymentDetails,
        refund_requested_at: new Date().toISOString(),
        refund_requested_by: input.actorType,
        refund_request_reason: input.reason || null,
      },
    })
    .eq('id', input.orderId)
    .eq('status', previousStatus)
    .select('id')
    .maybeSingle();

  if (markPendingError || !pendingOrder) {
    throw new Error('Failed to start refund');
  }

  if (order.payment_method === 'stripe') {
    const stripeConfig = resolvePaymentProviderConfig(order.merchants, 'stripe');
    if (!stripeConfig.enabled) {
      await supabase
        .from('orders')
        .update({ status: previousStatus })
        .eq('id', input.orderId)
        .eq('status', 'refund_pending');
      throw new Error('Stripe is not configured');
    }

    const secretKey = stripeConfig.secretKey;
    const paymentIntentId = paymentDetails?.stripe_payment_intent;

    if (!secretKey || !paymentIntentId) {
      await supabase
        .from('orders')
        .update({ status: previousStatus })
        .eq('id', input.orderId)
        .eq('status', 'refund_pending');
      throw new Error('Missing Stripe credentials or payment intent ID');
    }

    const stripe = new Stripe(secretKey);
    try {
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
      }, {
        idempotencyKey: `order-refund:${input.orderId}`,
      });
    } catch (error: any) {
      await supabase
        .from('orders')
        .update({ status: previousStatus })
        .eq('id', input.orderId)
        .eq('status', 'refund_pending');
      throw new Error(error.message || 'Stripe refund failed');
    }
  }

  const restockFailures: string[] = [];
  let reconciliationSummary: string | null = null;
  let orderItems: Array<{ product_id: string | null; variant_id: string | null; quantity: number }> = [];

  try {
    const { data: loadedOrderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('product_id, variant_id, quantity')
      .eq('order_id', input.orderId);

    if (orderItemsError) {
      reconciliationSummary = 'Failed to load order items for inventory reconciliation';
    } else {
      orderItems = loadedOrderItems || [];
    }

    for (const item of orderItems) {
      if (item.variant_id) {
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', item.variant_id)
          .single();

        if (variantError || !variant || variant.stock_quantity === null) {
          restockFailures.push(`variant:${item.variant_id}`);
          continue;
        }

        const { error: updateVariantError } = await supabase
          .from('product_variants')
          .update({ stock_quantity: variant.stock_quantity + item.quantity })
          .eq('id', item.variant_id);

        if (updateVariantError) {
          restockFailures.push(`variant:${item.variant_id}`);
        }
        continue;
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock_quantity, track_quantity')
        .eq('id', item.product_id)
        .single();

      if (productError || !product) {
        restockFailures.push(`product:${item.product_id}`);
        continue;
      }

      if ((product.track_quantity ?? true) && product.stock_quantity !== null) {
        const { error: updateProductError } = await supabase
          .from('products')
          .update({ stock_quantity: product.stock_quantity + item.quantity })
          .eq('id', item.product_id);

        if (updateProductError) {
          restockFailures.push(`product:${item.product_id}`);
        }
      }
    }
  } catch (error: any) {
    reconciliationSummary = error?.message || 'Inventory reconciliation failed';
  }

  const finalizedPaymentDetails = {
    ...paymentDetails,
    refunded_at: new Date().toISOString(),
    refunded_by: input.actorType,
    refund_actor_email: input.actorEmail || null,
    refund_reason: input.reason || null,
    inventory_restock_pending: restockFailures.length > 0 || Boolean(reconciliationSummary),
    inventory_restock_failures: restockFailures,
    refund_reconciliation_required: restockFailures.length > 0 || Boolean(reconciliationSummary),
    refund_reconciliation_summary: reconciliationSummary,
  };

  const { error: finalizeError } = await supabase
    .from('orders')
    .update({
      status: 'refunded',
      payment_details: finalizedPaymentDetails,
    })
    .eq('id', input.orderId)
    .eq('status', 'refund_pending');

  if (finalizeError) {
    throw new Error('Refund succeeded, but order finalization needs attention');
  }

  const { data: existingRefund } = await supabase
    .from('refunds')
    .select('id')
    .eq('order_id', input.orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingRefund?.id) {
    await supabase
      .from('refunds')
      .update({
        reason: input.reason || 'Customer refund request',
        status: 'approved',
        amount: order.total_amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRefund.id);
  } else {
    await supabase
      .from('refunds')
      .insert({
        order_id: input.orderId,
        merchant_id: order.merchant_id,
        reason: input.reason || 'Customer refund request',
        status: 'approved',
        amount: order.total_amount,
        updated_at: new Date().toISOString(),
      });
  }

  return {
    success: true,
    alreadyRefunded: false,
    attentionRequired: restockFailures.length > 0 || Boolean(reconciliationSummary),
    restockFailures,
    reconciliationSummary,
  };
}
