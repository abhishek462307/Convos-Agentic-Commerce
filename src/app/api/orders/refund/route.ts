import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { processOrderRefund } from '@/lib/domain/refunds';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.split(' ')[1]
    );
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // 1. Fetch order and merchant info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, merchants(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const merchant = order.merchants;

    // Verify the authenticated user owns this merchant
    if (merchant.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (order.status === 'refunded') {
      return NextResponse.json({ error: 'Order is already refunded' }, { status: 400 });
    }
    if (order.status === 'refund_pending') {
      return NextResponse.json({ error: 'Refund is already in progress' }, { status: 409 });
    }

    const result = await processOrderRefund({
      orderId,
      actorType: 'user',
      actorEmail: user.email,
      reason: 'Merchant refund request',
    });

    return NextResponse.json({
      success: true,
      message: result.attentionRequired
        ? 'Order refunded, but inventory reconciliation needs attention'
        : 'Order refunded successfully',
      attentionRequired: result.attentionRequired,
      restockFailures: result.restockFailures,
    });

  } catch (err: any) {
    logger.error('Refund route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
