import { sendNewOrderNotificationEmail, sendOrderConfirmationEmail } from '@/lib/email';
import logger from '@/lib/logger';

export async function sendPaidOrderNotifications(input: {
  merchant: any
  order: any
  items: Array<{ name: string; quantity: number; price: number }>
  paymentMethod: string
  customerEmailOverride?: string | null
}) {
  const { merchant, order, items, paymentMethod, customerEmailOverride } = input;
  const customerEmail = customerEmailOverride || order.customer_info?.email || '';
  const customerName = order.customer_info?.name || 'Customer';

  const smtpConfig = {
    smtp_enabled: merchant.smtp_enabled,
    smtp_host: merchant.smtp_host,
    smtp_port: merchant.smtp_port,
    smtp_user: merchant.smtp_user,
    smtp_password: merchant.smtp_password,
    smtp_from_email: merchant.smtp_from_email,
    smtp_from_name: merchant.smtp_from_name,
  };

  if (customerEmail && merchant.smtp_enabled && merchant.smtp_host) {
    sendOrderConfirmationEmail({
      orderId: order.id,
      customerName,
      customerEmail,
      storeName: merchant.store_name || 'Store',
      items,
      subtotal: order.subtotal || 0,
      shipping: order.shipping_amount || 0,
      tax: order.tax_amount || 0,
      total: order.total_amount || 0,
      currency: (merchant.currency || 'USD').toUpperCase(),
      shippingAddress: order.customer_info?.address ? {
        address: order.customer_info.address,
        city: order.customer_info.city || '',
        state: order.customer_info.state || '',
        country: order.customer_info.country || '',
        postalCode: order.customer_info.pincode || '',
      } : undefined,
    }, smtpConfig).catch((err) => logger.error('Failed to send paid order confirmation:', err));
  }

  const merchantEmail = merchant.order_notification_email || merchant.store_email;
  if (merchantEmail && merchant.smtp_enabled) {
    sendNewOrderNotificationEmail({
      merchantEmail,
      storeName: merchant.store_name || 'Store',
      orderId: order.id,
      customerName,
      customerEmail,
      total: order.total_amount || 0,
      currency: (merchant.currency || 'USD').toUpperCase(),
      items,
      paymentMethod,
    }, smtpConfig).catch((err) => logger.error('Failed to send paid order merchant notification:', err));
  }
}
