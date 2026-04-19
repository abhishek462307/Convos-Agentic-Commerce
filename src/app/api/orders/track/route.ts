import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleTrack(orderId: string | null, email: string | null) {
  try {
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required to track an order' }, { status: 400 });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name)), merchant_id')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.customer_info?.email || order.customer_info.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Order not found with this email' }, { status: 404 });
    }

    const { data: merchant } = await supabase
      .from('merchants')
      .select('store_name, currency')
      .eq('id', order.merchant_id)
      .single();

    const sanitizedOrder = {
      id: order.id,
      status: order.status,
      created_at: order.created_at,
      total_amount: order.total_amount,
      tracking_number: order.tracking_number,
      carrier: order.carrier,
      estimated_delivery: order.estimated_delivery,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      customer_info: {
        name: order.customer_info?.name,
        address: order.customer_info?.address,
        city: order.customer_info?.city,
        state: order.customer_info?.state,
        country: order.customer_info?.country,
      },
      items: (order.order_items || []).map((item: any) => ({
        name: item.products?.name || 'Product',
        quantity: item.quantity,
        price: Number(item.price_at_purchase),
      })),
      currency: merchant?.currency || 'USD',
      store_name: merchant?.store_name || 'Store',
    };

    return NextResponse.json({ order: sanitizedOrder });
  } catch (error: any) {
    logger.error('Track order error:', error);
    return NextResponse.json({ error: 'Failed to track order' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('orderId');
  const email = searchParams.get('email');

  return handleTrack(orderId, email);
}

export async function POST(request: Request) {
  const { orderId, email } = await request.json();
  return handleTrack(orderId, email);
}
