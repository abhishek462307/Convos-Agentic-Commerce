import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import { sendAbandonedCartEmail } from '@/lib/email';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isCronRequest(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: cart, error: cartError } = await supabase
      .from('abandoned_carts')
      .select('*, merchants(store_name, subdomain, currency)')
      .eq('id', id)
      .single();

    if (cartError || !cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    if (!isCronRequest(request)) {
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const access = await getMerchantAccess(user.id, cart.merchant_id, 'customers');
      if (!access.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
      }
    }

    if (cart.recovery_email_sent) {
      return NextResponse.json({ error: 'Recovery email already sent' }, { status: 400 });
    }

    if (!cart.customer_email) {
      return NextResponse.json({ error: 'No customer email' }, { status: 400 });
    }

    const items = (cart.cart_data || []).map((item: any) => ({
      name: item.name || 'Product',
      price: item.price || 0,
      image_url: item.image_url
    }));

    const result = await sendAbandonedCartEmail({
      customerEmail: cart.customer_email,
      storeName: cart.merchants?.store_name || 'Store',
      storeUrl: `/store/${cart.merchants?.subdomain}`,
      items,
      total: cart.total || 0,
      currency: cart.merchants?.currency || 'USD'
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    await supabase
      .from('abandoned_carts')
      .update({ recovery_email_sent: true })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error('Recovery email error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send recovery email' }, { status: 500 });
  }
}
