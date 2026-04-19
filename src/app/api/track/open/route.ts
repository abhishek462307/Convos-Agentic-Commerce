import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('c');
  const recipientId = searchParams.get('r');

  if (campaignId) {
    try {
      // Record the open event
      await supabaseAdmin.from('email_tracking_events').insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: 'open',
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      });

      // Update campaign stats
      const { data: campaign } = await supabaseAdmin
        .from('marketing_campaigns')
        .select('stats')
        .eq('id', campaignId)
        .single();

      if (campaign?.stats) {
        const currentOpens = campaign.stats.opens || 0;
        const currentSent = campaign.stats.sent || 1;
        const newOpens = currentOpens + 1;
        const openRate = Math.round((newOpens / currentSent) * 100);

        await supabaseAdmin
          .from('marketing_campaigns')
          .update({
            stats: {
              ...campaign.stats,
              opens: newOpens,
              open_rate: openRate,
            },
          })
          .eq('id', campaignId);
      }
    } catch (error) {
      logger.error('Open tracking error:', error);
    }
  }

  // Return tracking pixel
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
