import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { executeEmailCampaign } from '@/lib/domain/campaigns';
import logger from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    const { data: emailCampaigns } = await supabaseAdmin
      .from('marketing_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    const { data: whatsappCampaigns } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    const results = {
      emailsSent: 0,
      whatsappSent: 0,
      errors: [] as string[]
    };

    if (emailCampaigns && emailCampaigns.length > 0) {
      for (const campaign of emailCampaigns) {
        try {
          await executeEmailCampaign(campaign.id, campaign.merchant_id);
          results.emailsSent++;
        } catch (e: any) {
          results.errors.push(`Email campaign ${campaign.id}: ${e.message}`);
        }
      }
    }

    if (whatsappCampaigns && whatsappCampaigns.length > 0) {
      for (const campaign of whatsappCampaigns) {
        try {
          await supabaseAdmin
            .from('whatsapp_campaigns')
            .update({ status: 'sending', sent_at: now })
            .eq('id', campaign.id);
          
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const cronSecret = process.env.CRON_SECRET;
          fetch(`${baseUrl}/api/whatsapp/broadcast`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {})
            },
            body: JSON.stringify({ campaignId: campaign.id, merchantId: campaign.merchant_id })
          }).catch((e) => logger.error('Failed to send campaign:', e));
          
          results.whatsappSent++;
        } catch (e: any) {
          results.errors.push(`WhatsApp campaign ${campaign.id}: ${e.message}`);
        }
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    logger.error('Cron campaigns error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
