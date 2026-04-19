import { sendLowStockAlertEmail } from '@/lib/email';
import logger from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase-admin';

type PaymentDetails = Record<string, any>;

type NormalizedOrderItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  name: string;
  category: string | null;
};

export interface FinalizedOrderContext {
  order: any;
  merchant: any;
  items: Array<{ name: string; quantity: number; price: number }>;
}

export interface FinalizePaidOrderResult {
  success: boolean;
  alreadyFinalized: boolean;
  context?: FinalizedOrderContext;
  error?: string;
}

function asObject(value: any): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeOrderItem(rawItem: any): NormalizedOrderItem {
  const rawProduct = Array.isArray(rawItem.products) ? rawItem.products[0] : rawItem.products;
  return {
    productId: rawItem.product_id,
    variantId: rawItem.variant_id || null,
    quantity: Number(rawItem.quantity || 0),
    price: Number(rawItem.price_at_purchase || rawProduct?.price || 0),
    name: rawProduct?.name || 'Product',
    category: rawProduct?.category || null,
  };
}

async function updateCustomerIntelligence(
  order: any,
  merchantId: string,
  items: NormalizedOrderItem[],
  paymentDetails: PaymentDetails
) {
  const customerInfo = asObject(order.customer_info);
  const customerEmail = typeof customerInfo.email === 'string' ? customerInfo.email : '';
  if (!customerEmail) return;

  const total = Number(order.total_amount || 0);
  const bargainSavings = Number(paymentDetails.bargain_savings || 0);
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))];
  const now = new Date().toISOString();

  const { data: storeCustomer } = await supabaseAdmin
    .from('store_customers')
    .select('id, total_orders, total_spent, metadata')
    .eq('merchant_id', merchantId)
    .eq('email', customerEmail)
    .maybeSingle();

  if (storeCustomer) {
    const metadata = storeCustomer.metadata || {};
    await supabaseAdmin
      .from('store_customers')
      .update({
        name: customerInfo.name || null,
        phone: customerInfo.phone || null,
        total_orders: Number(storeCustomer.total_orders || 0) + 1,
        total_spent: Number(storeCustomer.total_spent || 0) + total,
        last_order_at: now,
        updated_at: now,
        metadata: {
          ...metadata,
          last_order_id: order.id,
          interests: [...new Set([...(metadata.interests || []), ...categories])],
          bargain_savings: bargainSavings,
        },
      })
      .eq('id', storeCustomer.id);
  } else {
    await supabaseAdmin.from('store_customers').insert({
      merchant_id: merchantId,
      email: customerEmail,
      name: customerInfo.name || null,
      phone: customerInfo.phone || null,
      total_orders: 1,
      total_spent: total,
      last_order_at: now,
      metadata: {
        last_order_id: order.id,
        interests: categories,
        bargain_savings: bargainSavings,
      },
    });
  }
}

export async function finalizePaidOrder({
  orderId,
  paymentMethod,
}: {
  orderId: string;
  paymentMethod?: string;
}): Promise<FinalizePaidOrderResult> {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, merchant_id, payment_method, payment_details, customer_info, total_amount, subtotal, shipping_amount, tax_amount, ai_negotiated')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, alreadyFinalized: false, error: 'Order not found' };
  }

  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('id, store_name, currency, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, store_email, order_notification_email, low_stock_threshold, low_stock_alerts_enabled')
    .eq('id', order.merchant_id)
    .single();

  if (merchantError || !merchant) {
    return { success: false, alreadyFinalized: false, error: 'Merchant not found' };
  }

  const { data: orderItems, error: orderItemsError } = await supabaseAdmin
    .from('order_items')
    .select('product_id, variant_id, quantity, price_at_purchase, products(name, price, category)')
    .eq('order_id', order.id);

  if (orderItemsError) {
    return { success: false, alreadyFinalized: false, error: 'Failed to load order items' };
  }

  const normalizedItems = (orderItems || []).map(normalizeOrderItem);
  const context: FinalizedOrderContext = {
    order,
    merchant,
    items: normalizedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  };

  const paymentDetails = asObject(order.payment_details);
  if (paymentDetails.finalized_at) {
    return { success: true, alreadyFinalized: true, context };
  }

  const variantIds = Array.from(new Set(normalizedItems.map((item) => item.variantId).filter(Boolean))) as string[];
  const productIds = Array.from(
    new Set(normalizedItems.filter((item) => !item.variantId).map((item) => item.productId).filter(Boolean))
  );

  const variantMap = new Map<string, any>();
  if (variantIds.length > 0) {
    const { data: variants } = await supabaseAdmin
      .from('product_variants')
      .select('id, stock_quantity')
      .in('id', variantIds);
    (variants || []).forEach((variant: any) => variantMap.set(variant.id, variant));
  }

  const productMap = new Map<string, any>();
  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, stock_quantity, track_quantity')
      .in('id', productIds);
    (products || []).forEach((product: any) => productMap.set(product.id, product));
  }

  let stockUpdateFailed = false;
  const decremented: Array<{ type: 'variant' | 'product'; id: string; previousStock: number }> = [];

  for (const item of normalizedItems) {
    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      if (variant && variant.stock_quantity !== null) {
        const nextStock = Number(variant.stock_quantity) - item.quantity;
        if (nextStock < 0) {
          stockUpdateFailed = true;
          break;
        }

        const { data: updatedRows, error: updateError } = await supabaseAdmin
          .from('product_variants')
          .update({ stock_quantity: nextStock })
          .eq('id', item.variantId)
          .eq('stock_quantity', variant.stock_quantity)
          .select('id');

        if (updateError || !updatedRows || updatedRows.length === 0) {
          stockUpdateFailed = true;
          break;
        }

        decremented.push({ type: 'variant', id: item.variantId, previousStock: Number(variant.stock_quantity) });
        variant.stock_quantity = nextStock;
      }
      continue;
    }

    const product = productMap.get(item.productId);
    if (product && (product.track_quantity ?? true) && product.stock_quantity !== null) {
      const nextStock = Number(product.stock_quantity) - item.quantity;
      if (nextStock < 0) {
        stockUpdateFailed = true;
        break;
      }

      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('products')
        .update({ stock_quantity: nextStock })
        .eq('id', item.productId)
        .eq('stock_quantity', product.stock_quantity)
        .select('id');

      if (updateError || !updatedRows || updatedRows.length === 0) {
        stockUpdateFailed = true;
        break;
      }

      decremented.push({ type: 'product', id: item.productId, previousStock: Number(product.stock_quantity) });
      product.stock_quantity = nextStock;
    }
  }

  if (stockUpdateFailed) {
    for (const entry of decremented) {
      if (entry.type === 'variant') {
        await supabaseAdmin.from('product_variants').update({ stock_quantity: entry.previousStock }).eq('id', entry.id);
      } else {
        await supabaseAdmin.from('products').update({ stock_quantity: entry.previousStock }).eq('id', entry.id);
      }
    }

    await supabaseAdmin
      .from('orders')
      .update({
        payment_details: {
          ...paymentDetails,
          finalization_error: 'insufficient_stock',
          finalization_error_at: new Date().toISOString(),
        },
      })
      .eq('id', order.id);

    return {
      success: false,
      alreadyFinalized: false,
      context,
      error: 'Insufficient stock for one or more items',
    };
  }

  const nextPaymentDetails: PaymentDetails = { ...paymentDetails };
  const discountId = typeof paymentDetails.discount_id === 'string' ? paymentDetails.discount_id : null;
  if (discountId && !paymentDetails.discount_marked_used) {
    const { data: discount } = await supabaseAdmin
      .from('discounts')
      .select('id, used_count, usage_limit')
      .eq('id', discountId)
      .eq('merchant_id', merchant.id)
      .single();

    if (discount?.id) {
      if (discount.usage_limit) {
        const { data: incrementedRows } = await supabaseAdmin
          .from('discounts')
          .update({ used_count: (discount.used_count || 0) + 1 })
          .eq('id', discount.id)
          .lt('used_count', discount.usage_limit)
          .select('id');

        if (incrementedRows && incrementedRows.length > 0) {
          nextPaymentDetails.discount_marked_used = true;
        }
      } else {
        await supabaseAdmin
          .from('discounts')
          .update({ used_count: (discount.used_count || 0) + 1 })
          .eq('id', discount.id);

        nextPaymentDetails.discount_marked_used = true;
      }
    }
  }

  const bargainSessionId = typeof paymentDetails.bargain_session_id === 'string' ? paymentDetails.bargain_session_id : null;
  if (bargainSessionId && !paymentDetails.bargain_marked_used) {
    await supabaseAdmin
      .from('bargained_prices')
      .update({ status: 'used' })
      .eq('session_id', bargainSessionId)
      .eq('merchant_id', merchant.id)
      .eq('status', 'active');

    nextPaymentDetails.bargain_marked_used = true;
  }

  if (!paymentDetails.customer_profile_updated_at) {
    await updateCustomerIntelligence(order, merchant.id, normalizedItems, paymentDetails);
    nextPaymentDetails.customer_profile_updated_at = new Date().toISOString();
  }

  if (merchant.low_stock_alerts_enabled && merchant.smtp_enabled) {
    const threshold = merchant.low_stock_threshold || 10;
    const { data: lowStockProducts } = await supabaseAdmin
      .from('products')
      .select('name, sku, stock_quantity')
      .eq('merchant_id', merchant.id)
      .not('stock_quantity', 'is', null)
      .lte('stock_quantity', threshold);

    if (lowStockProducts && lowStockProducts.length > 0) {
      const merchantEmail = merchant.order_notification_email || merchant.store_email;
      if (merchantEmail) {
        sendLowStockAlertEmail(
          {
            merchantEmail,
            storeName: merchant.store_name,
            products: lowStockProducts.map((product: any) => ({
              name: product.name,
              sku: product.sku,
              stock_quantity: product.stock_quantity,
              threshold,
            })),
          },
          {
            smtp_enabled: merchant.smtp_enabled,
            smtp_host: merchant.smtp_host,
            smtp_port: merchant.smtp_port,
            smtp_user: merchant.smtp_user,
            smtp_password: merchant.smtp_password,
            smtp_from_email: merchant.smtp_from_email,
            smtp_from_name: merchant.smtp_from_name,
          }
        ).catch((error) => logger.error('Failed to send low stock alert:', error));
      }
    }
  }

  nextPaymentDetails.finalized_at = new Date().toISOString();
  nextPaymentDetails.finalization_error = null;
  nextPaymentDetails.finalized_payment_method = paymentMethod || order.payment_method || null;

  const { error: finalizeError } = await supabaseAdmin
    .from('orders')
    .update({ payment_details: nextPaymentDetails })
    .eq('id', order.id);

  if (finalizeError) {
    return { success: false, alreadyFinalized: false, context, error: 'Failed to persist finalization state' };
  }

  return {
    success: true,
    alreadyFinalized: false,
    context: {
      ...context,
      order: {
        ...order,
        payment_details: nextPaymentDetails,
      },
    },
  };
}
