import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { event_type, event_data, consumer_email, subdomain } = await request.json();

    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin.from('storefront_conversations').insert({
      merchant_id: merchant.id,
      consumer_email: consumer_email || null,
      event_type,
      event_data,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to log consumer event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
