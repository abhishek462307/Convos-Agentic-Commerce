import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { triggerAutomation } from '@/lib/marketing-automations';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
      const authHeader = request.headers.get('authorization');
      const cronSecret = process.env.CRON_SECRET;
      
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any = {
      price_drop: 0,
      shipping_update: 0,
      cart_abandoned: 0
    };

    // 1. Check for Price Drops
    // Find products where price < compare_at_price and updated in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .gt('updated_at', twentyFourHoursAgo);

    for (const product of products || []) {
      if (product.price < (product.compare_at_price || 0)) {
        // Find customers who might be interested (e.g. all customers for now, or those who bought before)
        const { data: customers } = await supabase
          .from('store_customers')
          .select('*')
          .eq('merchant_id', product.merchant_id)
          .limit(10); // Limit for safety in demo

        for (const customer of customers || []) {
          if (customer.phone) {
            await triggerAutomation('price_drop', product.merchant_id, {
              phone: customer.phone,
              customerId: customer.id,
              productName: product.name,
              oldPrice: product.compare_at_price,
              newPrice: product.price
            });
            results.price_drop++;
          }
        }
      }
    }

    // 2. Check for Shipping Updates
    // Find orders with status 'shipped' updated recently
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: shippedOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'shipped')
      .gt('updated_at', oneHourAgo);

    for (const order of shippedOrders || []) {
      const customerInfo = order.customer_info as any;
      if (customerInfo?.phone) {
        // Find customer ID from phone/email
        const { data: customer } = await supabase
          .from('store_customers')
          .select('id')
          .eq('merchant_id', order.merchant_id)
          .or(`phone.eq.${customerInfo.phone},email.eq.${customerInfo.email}`)
          .maybeSingle();

        await triggerAutomation('shipping_update', order.merchant_id, {
          phone: customerInfo.phone,
          customerId: customer?.id,
          orderId: order.id,
          trackingNumber: order.tracking_number,
          carrier: order.carrier
        });
        results.shipping_update++;
      }
    }

    // 3. Abandoned Cart (WhatsApp specific check if not handled by email cron)
    // Note: The abandoned-carts cron already calls triggerAutomation('cart_abandoned', ...)
    // So we don't necessarily need to duplicate it here, but we can if we want a dedicated WhatsApp flow.

    return NextResponse.json({
      success: true,
      results
    });
  } catch (err: any) {
    logger.error('WhatsApp automations cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
