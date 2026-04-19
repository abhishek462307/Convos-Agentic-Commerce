import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { resolveMerchantContext } from '@/lib/merchant-context';

export async function GET(req: Request) {
  try {
    const result = await resolveMerchantContext(req);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const merchant = result.context.merchant;
    const alerts = [];

    const { data: lowStockProducts } = await supabaseAdmin
      .from('products')
      .select('id, name, stock_quantity')
      .eq('merchant_id', merchant.id)
      .eq('is_active', true)
      .lte('stock_quantity', 5)
      .gt('stock_quantity', 0);

    if (lowStockProducts && lowStockProducts.length > 0) {
      alerts.push({
        id: 'low_stock',
        type: 'low_stock',
        title: `${lowStockProducts.length} product${lowStockProducts.length > 1 ? 's' : ''} running low`,
        description: lowStockProducts.slice(0, 2).map(p => p.name).join(', ') + (lowStockProducts.length > 2 ? ` +${lowStockProducts.length - 2} more` : ''),
        count: lowStockProducts.length,
        action: `Which products are low on stock? Show me all ${lowStockProducts.length} of them and suggest restocking`
      });
    }

    const { count: pendingCount } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .eq('status', 'pending');

    if (pendingCount && pendingCount > 0) {
      alerts.push({
        id: 'pending_orders',
        type: 'pending_orders',
        title: `${pendingCount} order${pendingCount > 1 ? 's' : ''} awaiting confirmation`,
        description: 'These orders need your attention',
        count: pendingCount,
        action: `List all ${pendingCount} pending orders and help me confirm them`
      });
    }

    const { count: unshippedCount } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .in('status', ['confirmed', 'processing']);

    if (unshippedCount && unshippedCount > 0) {
      alerts.push({
        id: 'unshipped',
        type: 'unshipped',
        title: `${unshippedCount} order${unshippedCount > 1 ? 's' : ''} ready to ship`,
        description: 'Confirmed orders not yet marked as shipped',
        count: unshippedCount,
        action: `Show me all ${unshippedCount} orders ready to ship and help me mark them as shipped`
      });
    }

    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
}
