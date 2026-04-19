import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('c');
  const recipientId = searchParams.get('r');
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (campaignId) {
    try {
      // Record the click event
      await supabaseAdmin.from('email_tracking_events').insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: 'click',
        clicked_url: url,
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
        const currentClicks = campaign.stats.clicks || 0;
        const currentSent = campaign.stats.sent || 1;
        const newClicks = currentClicks + 1;
        const clickRate = Math.round((newClicks / currentSent) * 100);

        await supabaseAdmin
          .from('marketing_campaigns')
          .update({
            stats: {
              ...campaign.stats,
              clicks: newClicks,
              click_rate: clickRate,
            },
          })
          .eq('id', campaignId);
      }
    } catch (error) {
      logger.error('Click tracking error:', error);
    }
  }

  // Redirect to the actual URL
  return NextResponse.redirect(url);
}
