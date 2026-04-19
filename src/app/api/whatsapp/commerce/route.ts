import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthMerchant(request: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser(
    request.headers.get('Authorization')?.split(' ')[1] || ''
  );
  if (!user) return null;

  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('id, subdomain, store_name, currency')
    .eq('user_id', user.id)
    .single();

  return merchant || null;
}

export async function GET(request: NextRequest) {
  const merchant = await getAuthMerchant(request);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: config } = await supabaseAdmin
    .from('whatsapp_configs')
    .select('commerce_settings, status, phone_number')
    .eq('merchant_id', merchant.id)
    .single();

  const { data: sessionStats } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('id, auth_state, email_verified, cart, created_at, updated_at, phone_number')
    .eq('merchant_id', merchant.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  const sessions = sessionStats || [];
  const totalSessions = sessions.length;
  const authenticatedSessions = sessions.filter(s => s.email_verified).length;
  const sessionsWithCart = sessions.filter(s => s.cart?.length > 0).length;
  const activeSessions = sessions.filter(s => {
    const updatedAt = new Date(s.updated_at);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return updatedAt > cutoff;
  }).length;

  return NextResponse.json({
    settings: config?.commerce_settings || null,
    connection: {
      status: config?.status || 'disconnected',
      phone_number: config?.phone_number || null,
    },
    stats: {
      totalSessions,
      authenticatedSessions,
      sessionsWithCart,
      activeSessions,
    },
    recentSessions: sessions.slice(0, 20).map(s => ({
      id: s.id,
      phone_number: s.phone_number,
      auth_state: s.auth_state,
      email_verified: s.email_verified,
      cart_items: s.cart?.length || 0,
      cart_value: (s.cart || []).reduce((sum: number, item: any) => sum + (item.price * (item.quantity || 1)), 0),
      updated_at: s.updated_at,
    })),
  });
}

export async function PUT(request: NextRequest) {
  const merchant = await getAuthMerchant(request);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  const { error } = await supabaseAdmin
    .from('whatsapp_configs')
    .upsert({
      merchant_id: merchant.id,
      commerce_settings: body,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'merchant_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
