import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import { updateMerchantOrderStatus } from '@/lib/domain/orders';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, status, trackingNumber, trackingUrl } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, merchants(store_name, currency, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const access = await getMerchantAccess(user.id, order.merchant_id, 'orders');
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    await updateMerchantOrderStatus({
      merchantId: order.merchant_id,
      actorType: 'user',
      orderId,
      status,
      trackingNumber,
      trackingUrl,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error('Order status update error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
