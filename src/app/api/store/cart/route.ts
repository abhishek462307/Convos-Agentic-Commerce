import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
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

    const authUser = await getAuthUser(request);
    let customerEmail: string | null = null;
    if (authUser) {
      const { data: storeCustomer } = await supabaseAdmin
        .from('store_customers')
        .select('email')
        .eq('merchant_id', merchant.id)
        .eq('user_id', authUser.id)
        .single();
      customerEmail = storeCustomer?.email || null;
    }

    const { data: cartRow } = await supabaseAdmin
      .from('store_carts')
      .select('cart_data')
      .eq('merchant_id', merchant.id)
      .eq('session_id', sessionId)
      .single();

    return NextResponse.json({
      cart: cartRow?.cart_data || [],
      consumerEmail: customerEmail,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, cart, consumerEmail } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
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

    const authUser = await getAuthUser(request);
    let authenticatedCustomerEmail: string | null = null;
    if (authUser) {
      const { data: storeCustomer } = await supabaseAdmin
        .from('store_customers')
        .select('email')
        .eq('merchant_id', merchant.id)
        .eq('user_id', authUser.id)
        .single();
      authenticatedCustomerEmail = storeCustomer?.email || null;
    }

    const payload: Record<string, any> = {
      merchant_id: merchant.id,
      session_id: sessionId,
      cart_data: cart || [],
      updated_at: new Date().toISOString(),
    };

    if (authenticatedCustomerEmail) {
      payload.consumer_email = authenticatedCustomerEmail;
    } else if (!consumerEmail) {
      payload.consumer_email = null;
    }

    const { error } = await supabaseAdmin
      .from('store_carts')
      .upsert(
        payload,
        { onConflict: 'merchant_id,session_id' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save cart' }, { status: 500 });
  }
}
