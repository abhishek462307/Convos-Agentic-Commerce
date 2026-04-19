import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { baileysConnect } from '@/lib/baileys-client';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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

    await supabaseAdmin
      .from('whatsapp_configs')
      .upsert({
        merchant_id: merchant.id,
        status: 'connecting',
        qr_code: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'merchant_id' });

    await baileysConnect(merchant.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('WhatsApp connect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
