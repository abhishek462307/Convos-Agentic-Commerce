import { sendAbandonedCartEmail } from '@/lib/email';
import logger from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface MerchantEmailConfig {
  id: string
  store_name?: string | null
  subdomain?: string | null
  currency?: string | null
  smtp_enabled?: boolean | null
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_user?: string | null
  smtp_password?: string | null
  smtp_from_email?: string | null
  smtp_from_name?: string | null
}

async function claimCartForRecovery(cartId: string) {
  const { data, error } = await supabaseAdmin
    .from('abandoned_carts')
    .update({ recovery_email_sent: true })
    .eq('id', cartId)
    .eq('recovery_email_sent', false)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function releaseCartRecoveryClaim(cartId: string) {
  await supabaseAdmin
    .from('abandoned_carts')
    .update({ recovery_email_sent: false })
    .eq('id', cartId);
}

export async function processAbandonedCartRecoveryForMerchant(
  merchantId: string,
  merchantConfig?: MerchantEmailConfig
) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: carts, error } = await supabaseAdmin
    .from('abandoned_carts')
    .select('id, merchant_id, customer_email, customer_name, customer_phone, cart_data, total')
    .eq('merchant_id', merchantId)
    .eq('recovery_email_sent', false)
    .not('customer_email', 'is', null)
    .lt('created_at', oneHourAgo)
    .gt('created_at', twentyFourHoursAgo)
    .limit(50);

  if (error) {
    throw error;
  }

  if (!carts || carts.length === 0) {
    return { processed: 0, sent: 0, failed: 0, claimed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let claimed = 0;
  const merchant = merchantConfig || {} as MerchantEmailConfig;
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const storeUrl = `${origin}/store/${merchant.subdomain}`;

  for (const cart of carts) {
    try {
      const claimedCart = await claimCartForRecovery(cart.id);
      if (!claimedCart) {
        continue;
      }

      claimed += 1;

      const items = (cart.cart_data || []).map((item: any) => ({
        name: item.name || 'Product',
        price: item.price || 0,
        image_url: item.image_url,
      }));

      const result = await sendAbandonedCartEmail({
        customerEmail: cart.customer_email,
        customerName: cart.customer_name,
        storeName: merchant.store_name || 'Store',
        storeUrl,
        items,
        total: cart.total || 0,
        currency: merchant.currency || 'USD',
      }, merchant.smtp_enabled && merchant.smtp_host ? {
        smtp_enabled: merchant.smtp_enabled ?? undefined,
        smtp_host: merchant.smtp_host ?? undefined,
        smtp_port: merchant.smtp_port ?? undefined,
        smtp_user: merchant.smtp_user ?? undefined,
        smtp_password: merchant.smtp_password ?? undefined,
        smtp_from_email: merchant.smtp_from_email ?? undefined,
        smtp_from_name: merchant.smtp_from_name ?? undefined,
      } : undefined);

      if (!result.success) {
        await releaseCartRecoveryClaim(cart.id);
        failed += 1;
        continue;
      }

      sent += 1;
    } catch (error) {
      logger.error('Abandoned cart recovery processing failed:', error);
      await releaseCartRecoveryClaim(cart.id);
      failed += 1;
    }
  }

  return {
    processed: carts.length,
    sent,
    failed,
    claimed,
  };
}
