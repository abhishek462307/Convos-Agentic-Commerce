import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { processAbandonedCartRecoveryForMerchant } from '@/lib/automation/abandoned-cart-recovery';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
      const authHeader = request.headers.get('authorization');
      const cronSecret = process.env.CRON_SECRET;
      
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: abandonedCarts, error } = await supabase
      .from('abandoned_carts')
      .select('*, merchants(id, store_name, subdomain, currency, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name)')
      .eq('recovery_email_sent', false)
      .not('customer_email', 'is', null)
      .lt('created_at', oneHourAgo)
      .gt('created_at', twentyFourHoursAgo)
      .limit(50);

    if (error) {
      logger.error('Error fetching abandoned carts:', error);
      return NextResponse.json({ error: 'Failed to fetch abandoned carts' }, { status: 500 });
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No abandoned carts to process' });
    }

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    const merchantsToProcess = new Map<string, any>();
    for (const cart of abandonedCarts) {
      if (!cart.merchant_id || !cart.merchants || merchantsToProcess.has(cart.merchant_id)) {
        continue;
      }
      merchantsToProcess.set(cart.merchant_id, cart.merchants);
    }

    for (const [merchantId, merchant] of merchantsToProcess) {

      try {
        const result = await processAbandonedCartRecoveryForMerchant(merchantId, {
          id: merchant.id,
          store_name: merchant.store_name,
          subdomain: merchant.subdomain,
          currency: merchant.currency,
          smtp_enabled: merchant.smtp_enabled,
          smtp_host: merchant.smtp_host,
          smtp_port: merchant.smtp_port,
          smtp_user: merchant.smtp_user,
          smtp_password: merchant.smtp_password,
          smtp_from_email: merchant.smtp_from_email,
          smtp_from_name: merchant.smtp_from_name,
        });

        successCount += result.sent;
        failCount += result.failed;
        skippedCount += Math.max(0, result.processed - result.claimed);

        if (result.sent > 0) {
          try {
            const { triggerAutomation } = await import('@/lib/marketing-automations');
            await triggerAutomation('cart_abandoned', merchant.id, {
              recoveredCount: result.sent,
            });
          } catch (e) {
            logger.error('Automation engine trigger error:', e);
          }
        }
      } catch (err) {
        logger.error(`Failed to process abandoned cart recovery for merchant ${merchantId}:`, err);
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: abandonedCarts.length,
      sent: successCount,
      failed: failCount,
      skipped: skippedCount
    });
  } catch (err: any) {
    logger.error('Abandoned cart automation error:', err);
    return NextResponse.json({ error: err.message || 'Automation failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Abandoned cart automation endpoint. Use POST to trigger.',
    description: 'This endpoint processes abandoned carts older than 1 hour and sends recovery emails using merchant SMTP configuration.'
  });
}
