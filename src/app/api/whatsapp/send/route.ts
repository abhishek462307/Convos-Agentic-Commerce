import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { baileysSend } from '@/lib/baileys-client';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { phone, message, merchantId } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const access = await getMerchantAccess(user.id, merchantId, 'customers');
      if (!access.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
      }
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('1') && cleanPhone.length === 10) {
      cleanPhone = '1' + cleanPhone;
    }

    try {
      const result = await baileysSend(merchantId, cleanPhone, message);

      await supabaseAdmin.from('whatsapp_message_logs').insert({
        merchant_id: merchantId,
        phone: cleanPhone,
        message,
        direction: 'outbound',
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      return NextResponse.json({ 
        success: true, 
        isLive: true,
        messageId: result.messageId,
        message: 'Message sent via WhatsApp'
      });
    } catch (sendError: any) {
      if (sendError.message?.includes('Not connected')) {
        logger.info(`[SIMULATED] WhatsApp message to ${cleanPhone}: ${message}`);

        await supabaseAdmin.from('whatsapp_message_logs').insert({
          merchant_id: merchantId,
          phone: cleanPhone,
          message,
          direction: 'outbound',
          status: 'simulated',
          sent_at: new Date().toISOString()
        });

        return NextResponse.json({ 
          success: true, 
          isLive: false,
          message: 'Message logged (WhatsApp not connected - connect in Settings to send real messages)'
        });
      }

      logger.error('WhatsApp send error:', sendError);
      return NextResponse.json({ error: sendError.message || 'Failed to send' }, { status: 500 });
    }
  } catch (err: any) {
    logger.error('WhatsApp send error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
