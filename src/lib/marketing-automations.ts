import logger from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendAbandonedCartEmail, sendPromotionalEmail, sendShippingUpdateEmail } from '@/lib/email';

export type AutomationTrigger = 'cart_abandoned' | 'new_subscriber' | 'order_completed' | 'reengagement' | 'price_drop' | 'shipping_update';

async function getMerchantSmtp(merchantId: string) {
  const { data } = await supabaseAdmin
    .from('merchants')
    .select('store_name, subdomain, currency, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name')
    .eq('id', merchantId)
    .single();
  return data;
}

function buildSmtpConfig(merchant: Record<string, unknown> | null) {
  if (!merchant?.smtp_enabled || !merchant.smtp_host) return undefined;
  return {
    smtp_enabled: Boolean(merchant.smtp_enabled),
    smtp_host: String(merchant.smtp_host),
    smtp_port: Number(merchant.smtp_port) || 465,
    smtp_user: merchant.smtp_user ? String(merchant.smtp_user) : undefined,
    smtp_password: merchant.smtp_password ? String(merchant.smtp_password) : undefined,
    smtp_from_email: merchant.smtp_from_email ? String(merchant.smtp_from_email) : undefined,
    smtp_from_name: merchant.smtp_from_name ? String(merchant.smtp_from_name) : undefined,
  };
}

export interface AutomationPayload {
  email?: string;
  name?: string;
  phone?: string;
  customerId?: string;
  items?: Array<{ name?: string; price?: number; image_url?: string; quantity?: number }>;
  total?: number;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  orderId?: string;
  productName?: string;
  oldPrice?: string;
  newPrice?: string;
  shippingStatus?: 'shipped' | 'delivered';
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  recoveredCount?: number;
}

export async function triggerAutomation(trigger: AutomationTrigger, merchantId: string, payload: AutomationPayload) {
  try {
    const { data: automations } = await supabaseAdmin
      .from('marketing_automations')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('trigger_type', trigger)
      .eq('status', 'active');

    if (!automations || automations.length === 0) return;

    const merchant = await getMerchantSmtp(merchantId);
    if (!merchant) return;

    const smtpConfig = buildSmtpConfig(merchant);
    const storeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://convos.sh'}/store/${merchant.subdomain}`;

    for (const automation of automations) {
      const currentRuns = (automation.stats?.runs || 0) + 1;
      let emailSent = false;

      if (trigger === 'new_subscriber' && payload.email) {
        const result = await sendPromotionalEmail({
          customerEmail: payload.email,
          customerName: payload.name,
          storeName: merchant.store_name || 'Store',
          storeUrl,
          subject: `Welcome to ${merchant.store_name || 'our store'}!`,
          headline: 'Welcome!',
          bodyText: 'Thanks for subscribing to our newsletter. We\'ll keep you updated with our latest products and offers.',
          ctaText: 'Browse Store',
          ctaUrl: storeUrl,
          currency: merchant.currency || 'USD',
        }, smtpConfig);
        emailSent = !!result.success;
      }

      if (trigger === 'cart_abandoned' && payload.email) {
        const items = (payload.items || []).map((item): { name: string; price: number; image_url?: string } => ({
          name: item.name || 'Product',
          price: item.price || 0,
          image_url: item.image_url,
        }));
        const result = await sendAbandonedCartEmail({
          customerEmail: payload.email,
          customerName: payload.name,
          storeName: merchant.store_name || 'Store',
          storeUrl,
          items,
          total: payload.total || 0,
          currency: merchant.currency || 'USD',
        }, smtpConfig);
        emailSent = !!result.success;
      }

      if (trigger === 'order_completed' && payload.email) {
        const result = await sendPromotionalEmail({
          customerEmail: payload.email,
          customerName: payload.name,
          storeName: merchant.store_name || 'Store',
          storeUrl,
          subject: `Thank you for your order at ${merchant.store_name}!`,
          headline: 'Thank You!',
          bodyText: 'We appreciate your purchase. Your order is being processed and we\'ll notify you when it ships.',
          ctaText: 'Continue Shopping',
          ctaUrl: storeUrl,
          currency: merchant.currency || 'USD',
        }, smtpConfig);
        emailSent = !!result.success;
      }

      if (trigger === 'price_drop' && payload.email) {
        const result = await sendPromotionalEmail({
          customerEmail: payload.email,
          customerName: payload.name,
          storeName: merchant.store_name || 'Store',
          storeUrl,
          subject: `Price Drop: ${payload.productName}`,
          headline: 'Price Drop Alert!',
          bodyText: `Great news! ${payload.productName} has dropped from ${payload.oldPrice} to ${payload.newPrice}.`,
          ctaText: 'Shop Now',
          ctaUrl: storeUrl,
          currency: merchant.currency || 'USD',
        }, smtpConfig);
        emailSent = !!result.success;
      }

        if (trigger === 'shipping_update' && payload.email && payload.orderId) {
          const items = (payload.items || []).map((item): { name: string; quantity: number; price: number } => ({
            name: item.name || 'Product',
            quantity: item.quantity || 1,
            price: item.price || 0,
          }));
          const result = await sendShippingUpdateEmail({
            orderId: payload.orderId,
            customerName: payload.name || 'Customer',
            customerEmail: payload.email,
            storeName: merchant.store_name || 'Store',
            items,
            subtotal: payload.subtotal || 0,
            shipping: payload.shipping || 0,
            tax: payload.tax || 0,
            total: payload.total || 0,
            currency: merchant.currency || 'USD',
            status: payload.shippingStatus || 'shipped',
            trackingNumber: payload.trackingNumber,
            trackingUrl: payload.trackingUrl,
          }, smtpConfig);
          emailSent = !!result.success;
        }

        if (trigger === 'reengagement' && payload.email) {
        const result = await sendPromotionalEmail({
          customerEmail: payload.email,
          customerName: payload.name,
          storeName: merchant.store_name || 'Store',
          storeUrl,
          subject: `We miss you at ${merchant.store_name}!`,
          headline: 'We Miss You!',
          bodyText: 'It\'s been a while since your last visit. Come check out what\'s new!',
          ctaText: 'Come Back',
          ctaUrl: storeUrl,
          currency: merchant.currency || 'USD',
        }, smtpConfig);
        emailSent = !!result.success;
      }

      await supabaseAdmin
        .from('marketing_automations')
        .update({
          stats: {
            ...automation.stats,
            runs: currentRuns,
            conversions: (automation.stats?.conversions || 0) + (emailSent ? 1 : 0),
          },
        })
        .eq('id', automation.id);

      await supabaseAdmin
        .from('marketing_logs')
        .insert([{
          merchant_id: merchantId,
          automation_id: automation.id,
          customer_id: payload.customerId,
          channel: payload.phone ? 'whatsapp' : 'email',
          event_type: trigger,
          status: emailSent ? 'sent' : 'failed',
          metadata: { email: payload.email, phone: payload.phone, trigger },
        }]);
    }
  } catch (err) {
    logger.error(`Error triggering automation ${trigger}:`, err);
  }
}
