import { createClient } from '@supabase/supabase-js';
import { sendShippingUpdateEmail } from '@/lib/email';
import { logDomainEvent } from '@/lib/agentic/events';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UpdateOrderStatusInput {
  merchantId: string
  actorType: 'user' | 'agent' | 'system' | 'webhook'
  orderId: string
  status: string
  trackingNumber?: string
  trackingUrl?: string
}

export async function updateMerchantOrderStatus(input: UpdateOrderStatusInput) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, merchants(store_name, currency, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name)')
    .eq('id', input.orderId)
    .eq('merchant_id', input.merchantId)
    .single();

  if (orderError || !order) {
    throw orderError || new Error('Order not found');
  }

  const updateData: Record<string, any> = { status: input.status };
  if (input.trackingNumber) updateData.tracking_number = input.trackingNumber;
  if (input.trackingUrl) updateData.tracking_url = input.trackingUrl;

  const { error: updateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', input.orderId)
    .eq('merchant_id', input.merchantId);

  if (updateError) {
    throw updateError;
  }

  await logDomainEvent({
    merchantId: input.merchantId,
    type: 'order_status_updated',
    title: 'Order status updated',
    summary: `Order ${input.orderId.slice(0, 8).toUpperCase()} moved to ${input.status}.`,
    actor: input.actorType,
    orderId: input.orderId,
    consumerEmail: order.customer_info?.email || null,
    factors: {
      status: input.status,
      trackingNumber: input.trackingNumber || null,
    },
  });

  const merchant = order.merchants;
  if ((input.status === 'shipped' || input.status === 'delivered') && order.customer_info?.email && merchant?.smtp_enabled && merchant?.smtp_host) {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, products(name)')
      .eq('order_id', input.orderId);

    const items = orderItems?.map((item) => ({
      name: item.products?.name || 'Product',
      quantity: item.quantity,
      price: item.price_at_purchase,
    })) || [];

    sendShippingUpdateEmail({
      orderId: input.orderId,
      customerName: order.customer_info.name || 'Customer',
      customerEmail: order.customer_info.email,
      storeName: merchant.store_name || 'Store',
      items,
      subtotal: order.total_amount,
      shipping: order.customer_info?.shipping_applied?.amount || 0,
      tax: order.customer_info?.tax_applied?.amount || 0,
      total: order.total_amount,
      currency: merchant.currency || 'USD',
      status: input.status,
      trackingNumber: input.trackingNumber,
      trackingUrl: input.trackingUrl,
    }, {
      smtp_enabled: merchant.smtp_enabled,
      smtp_host: merchant.smtp_host,
      smtp_port: merchant.smtp_port,
      smtp_user: merchant.smtp_user,
      smtp_password: merchant.smtp_password,
      smtp_from_email: merchant.smtp_from_email,
      smtp_from_name: merchant.smtp_from_name,
    }).catch((err) => logger.error('Failed to send shipping update email:', err));
  }

  return { success: true };
}
