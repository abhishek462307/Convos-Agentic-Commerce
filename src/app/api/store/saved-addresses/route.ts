import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const normalizedEmail = authUser.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ addresses: [], isFirstTime: true });
    }

    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('customer_info, created_at')
      .eq('merchant_id', merchant.id)
      .ilike('customer_info->>email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const seen = new Set<string>();
    const addresses: Array<{
      name: string | null;
      phone: string | null;
      address: string;
      city: string | null;
      state: string | null;
      pincode: string | null;
      country: string | null;
    }> = [];

    for (const order of orders || []) {
      const info = order.customer_info || {};
      if (!info.address) continue;

      const key = `${info.address}-${info.city || ''}-${info.state || ''}-${info.pincode || ''}-${info.country || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);

      addresses.push({
        name: info.name || null,
        phone: info.phone || null,
        address: info.address,
        city: info.city || null,
        state: info.state || null,
        pincode: info.pincode || info.postal_code || null,
        country: info.country || null,
      });

      if (addresses.length >= 5) break;
    }

    return NextResponse.json({
      addresses,
      isFirstTime: addresses.length === 0,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch saved addresses' }, { status: 500 });
  }
}
