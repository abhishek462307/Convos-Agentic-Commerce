import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { baileysStatus } from '@/lib/baileys-client';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser(
      request.headers.get('Authorization')?.split(' ')[1] || ''
    );

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const baileysState = await baileysStatus(merchant.id).catch(() => null);

    if (baileysState?.qr) {
      await supabaseAdmin
        .from('whatsapp_configs')
        .upsert({
          merchant_id: merchant.id,
          status: 'qr_ready',
          qr_code: baileysState.qr,
          updated_at: new Date().toISOString()
        }, { onConflict: 'merchant_id' });
    } else if (baileysState?.status === 'connected') {
      await supabaseAdmin
        .from('whatsapp_configs')
        .upsert({
          merchant_id: merchant.id,
          status: 'connected',
          qr_code: null,
          phone_number: baileysState.phone,
          updated_at: new Date().toISOString()
        }, { onConflict: 'merchant_id' });
    }

    const { data: config } = await supabaseAdmin
      .from('whatsapp_configs')
      .select('*')
      .eq('merchant_id', merchant.id)
      .single();

    return NextResponse.json({ config });
  } catch (error) {
    logger.error('WhatsApp status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
