import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subdomain, name, phone, email, message, preferredTime } = body;

    if (!subdomain || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id, store_name')
      .eq('subdomain', subdomain)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('callback_requests')
      .insert({
        merchant_id: merchant.id,
        name,
        phone,
        email: email || null,
        message: message || null,
        preferred_time: preferredTime || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
