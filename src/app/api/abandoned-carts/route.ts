import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
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

export async function POST(request: Request) {
  try {
    const { merchantId, customerEmail, cartData, total } = await request.json();

    if (!merchantId || !cartData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isCronRequest(request)) {
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const access = await getMerchantAccess(user.id, merchantId, 'customers');
      if (!access.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
      }
    }

    const { data: existing } = await supabase
      .from('abandoned_carts')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('customer_email', customerEmail)
      .eq('recovered', false)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('abandoned_carts')
        .update({ cart_data: cartData, total, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) throw error;
      return NextResponse.json({ success: true, updated: true });
    }

    const { data, error } = await supabase
      .from('abandoned_carts')
      .insert({
        merchant_id: merchantId,
        customer_email: customerEmail,
        cart_data: cartData,
        total
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, cart: data });
  } catch (err: any) {
    logger.error('Abandoned cart error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save cart' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');

    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
    }

    if (!isCronRequest(request)) {
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const access = await getMerchantAccess(user.id, merchantId, 'customers');
      if (!access.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
      }
    }

    const { data, error } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('recovered', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ carts: data || [] });
  } catch (err: any) {
    logger.error('Fetch abandoned carts error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch carts' }, { status: 500 });
  }
}
