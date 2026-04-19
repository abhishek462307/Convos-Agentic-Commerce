import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id');

    if (!merchantId) {
      return NextResponse.json({ error: 'merchant_id required' }, { status: 400 });
    }

    const access = await getMerchantAccess(user.id, merchantId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    const [ordersResult, negotiationsResult, missionsResult, eventsResult] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id, total_amount, ai_assisted, ai_negotiated, ai_revenue_delta, created_at')
        .eq('merchant_id', merchantId),
      supabaseAdmin
        .from('ai_events')
        .select('id, event_type, event_data, created_at')
        .eq('merchant_id', merchantId)
        .eq('event_type', 'negotiation_completed'),
      supabaseAdmin
        .from('customer_intents')
        .select('id, status, created_at')
        .eq('merchant_id', merchantId),
      supabaseAdmin
        .from('ai_events')
        .select('id, event_type, event_data, created_at')
        .eq('merchant_id', merchantId)
    ]);

    const orders = ordersResult.data || [];
    const negotiations = negotiationsResult.data || [];
    const missions = missionsResult.data || [];
    const events = eventsResult.data || [];

    const aiAssistedOrders = orders.filter(o => o.ai_assisted);
    const aiNegotiatedOrders = orders.filter(o => o.ai_negotiated);

    const revenueInfluenced = aiAssistedOrders.reduce(
      (acc, o) => acc + Number(o.total_amount || 0), 0
    );

    const negotiationSavings = Math.abs(
      aiNegotiatedOrders.reduce((acc, o) => acc + Number(o.ai_revenue_delta || 0), 0)
    );

    const missionsCompleted = missions.filter(m => m.status === 'completed').length;
    const missionsActive = missions.filter(m => m.status === 'active').length;

    const missionConversions = events.filter(
      e => e.event_type === 'order_ai_assisted' && e.event_data?.source === 'ai_payment_link'
    ).length;

    const negotiationsAccepted = negotiations.length;

    return NextResponse.json({
      orders_total: orders.length,
      orders_ai_assisted: aiAssistedOrders.length,
      orders_ai_negotiated: aiNegotiatedOrders.length,
      revenue_total: orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0),
      revenue_influenced: revenueInfluenced,
      negotiation_savings: negotiationSavings,
      negotiations_completed: negotiationsAccepted,
      missions_completed: missionsCompleted,
      missions_active: missionsActive,
      missions_triggered_conversion: missionConversions,
      ai_assist_rate: orders.length > 0
        ? Math.round((aiAssistedOrders.length / orders.length) * 100)
        : 0
    });
  } catch (err: any) {
    logger.error('AI metrics error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
