import nodemailer from 'nodemailer';
import logger from '@/lib/logger';

interface SmtpConfig {
  smtp_enabled?: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
}

function getPlatformSmtpConfig(): SmtpConfig | null {
  const host = process.env.PLATFORM_SMTP_HOST;
  const user = process.env.PLATFORM_SMTP_USER;
  const password = process.env.PLATFORM_SMTP_PASSWORD;
  if (!host || !user || !password) return null;
  return {
    smtp_enabled: true,
    smtp_host: host,
    smtp_port: parseInt(process.env.PLATFORM_SMTP_PORT || '465', 10),
    smtp_user: user,
    smtp_password: password,
    smtp_from_email: process.env.PLATFORM_SMTP_FROM_EMAIL || user,
    smtp_from_name: process.env.PLATFORM_SMTP_FROM_NAME || 'Open Commerce',
  };
}

function resolveSmtpConfig(merchantConfig?: SmtpConfig): SmtpConfig | null {
  if (merchantConfig?.smtp_enabled && merchantConfig.smtp_host) {
    return merchantConfig;
  }
  return getPlatformSmtpConfig();
}

async function sendWithSmtp(smtpConfig: SmtpConfig, to: string, subject: string, html: string) {
  if (!smtpConfig.smtp_enabled || !smtpConfig.smtp_host) {
    return { success: false, error: 'SMTP not configured.' };
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.smtp_host,
    port: smtpConfig.smtp_port || 465,
    secure: smtpConfig.smtp_port === 465,
    auth: {
      user: smtpConfig.smtp_user,
      pass: smtpConfig.smtp_password,
    },
  });

  await transporter.sendMail({
    from: `"${smtpConfig.smtp_from_name || 'Store'}" <${smtpConfig.smtp_from_email}>`,
    to,
    subject,
    html,
  });

  return { success: true };
}

async function sendEmail(to: string, subject: string, html: string, smtpConfig?: SmtpConfig, fromName?: string) {
  const resolved = resolveSmtpConfig(smtpConfig);
  if (resolved) {
    if (fromName) {
      resolved.smtp_from_name = fromName;
    }
    return sendWithSmtp(resolved, to, subject, html);
  }
  return { success: false, error: 'SMTP not configured.' };
}

interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  storeName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
};

export async function sendOrderConfirmationEmail(data: OrderEmailData, smtpConfig?: SmtpConfig) {
  const { orderId, customerName, customerEmail, storeName, items, subtotal, shipping, tax, total, currency, shippingAddress } = data;
  
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f1f1f1;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f1f1; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f1f1; text-align: right;">${formatCurrency(item.price * item.quantity, currency)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f6f7;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #202223; padding: 32px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">${storeName}</h1>
          </div>
          
          <div style="padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; background: #e3f1df; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">✓</span>
              </div>
              <h2 style="margin: 0 0 8px; color: #202223; font-size: 20px;">Order Confirmed!</h2>
              <p style="margin: 0; color: #6d7175; font-size: 14px;">Thank you for your order, ${customerName}!</p>
            </div>
            
            <div style="background: #f6f6f7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; color: #6d7175; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Order Number</p>
              <p style="margin: 0; color: #202223; font-size: 16px; font-weight: 600;">#${orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            
            <h3 style="margin: 0 0 16px; color: #202223; font-size: 14px; font-weight: 600;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f6f6f7;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: #6d7175; text-transform: uppercase;">Item</th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; color: #6d7175; text-transform: uppercase;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; color: #6d7175; text-transform: uppercase;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="border-top: 2px solid #f1f1f1; padding-top: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6d7175; font-size: 14px;">Subtotal</span>
                <span style="color: #202223; font-size: 14px;">${formatCurrency(subtotal, currency)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6d7175; font-size: 14px;">Shipping</span>
                <span style="color: #202223; font-size: 14px;">${shipping > 0 ? formatCurrency(shipping, currency) : 'Free'}</span>
              </div>
              ${tax > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6d7175; font-size: 14px;">Tax</span>
                <span style="color: #202223; font-size: 14px;">${formatCurrency(tax, currency)}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #f1f1f1;">
                <span style="color: #202223; font-size: 16px; font-weight: 600;">Total</span>
                <span style="color: #202223; font-size: 16px; font-weight: 600;">${formatCurrency(total, currency)}</span>
              </div>
            </div>
            
            ${shippingAddress ? `
            <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid #f1f1f1;">
              <h3 style="margin: 0 0 12px; color: #202223; font-size: 14px; font-weight: 600;">Shipping Address</h3>
              <p style="margin: 0; color: #6d7175; font-size: 14px; line-height: 1.6;">
                ${customerName}<br>
                ${shippingAddress.address}<br>
                ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br>
                ${shippingAddress.country}
              </p>
            </div>
            ` : ''}
          </div>
          
          <div style="background: #f6f6f7; padding: 24px; text-align: center;">
            <p style="margin: 0; color: #6d7175; font-size: 12px;">
              Questions? Reply to this email or contact us at support@${storeName.toLowerCase().replace(/\s+/g, '')}.com
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
        const subject = `Order Confirmed - #${orderId.slice(0, 8).toUpperCase()}`;
        return await sendEmail(customerEmail, subject, html, smtpConfig, storeName);
      } catch (error) {
      logger.error('sendOrderConfirmationEmail error:', error);
      return { success: false, error };
    }
  }

export async function sendShippingUpdateEmail(data: OrderEmailData & { status: 'shipped' | 'delivered' }, smtpConfig?: SmtpConfig) {
  const { orderId, customerName, customerEmail, storeName, status, trackingNumber, trackingUrl } = data;
  
  const isDelivered = status === 'delivered';
  const icon = isDelivered ? '📦' : '🚚';
  const title = isDelivered ? 'Your Order Has Been Delivered!' : 'Your Order Has Shipped!';
  const message = isDelivered 
    ? 'Your order has been delivered. We hope you love your purchase!'
    : 'Great news! Your order is on its way.';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f6f7;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #202223; padding: 32px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">${storeName}</h1>
          </div>
          
          <div style="padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
              <h2 style="margin: 0 0 8px; color: #202223; font-size: 20px;">${title}</h2>
              <p style="margin: 0; color: #6d7175; font-size: 14px;">${message}</p>
            </div>
            
            <div style="background: #f6f6f7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; color: #6d7175; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Order Number</p>
              <p style="margin: 0; color: #202223; font-size: 16px; font-weight: 600;">#${orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            
            ${trackingNumber ? `
            <div style="background: #eaf5ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; color: #005bd3; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Tracking Number</p>
              <p style="margin: 0; color: #202223; font-size: 16px; font-weight: 600;">${trackingNumber}</p>
              ${trackingUrl ? `
              <a href="${trackingUrl}" style="display: inline-block; margin-top: 12px; background: #005bd3; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">Track Package</a>
              ` : ''}
            </div>
            ` : ''}
          </div>
          
          <div style="background: #f6f6f7; padding: 24px; text-align: center;">
            <p style="margin: 0; color: #6d7175; font-size: 12px;">
              Questions? Reply to this email or contact us.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        const subject = isDelivered ? `Order Delivered - #${orderId.slice(0, 8).toUpperCase()}` : `Your Order Has Shipped - #${orderId.slice(0, 8).toUpperCase()}`;
        return await sendEmail(customerEmail, subject, html, smtpConfig, storeName);
      } catch (error) {
      logger.error('sendShippingUpdateEmail error:', error);
      return { success: false, error };
    }
  }

export async function sendApprovalNotificationEmail(
  data: {
    type: 'refund' | 'loyalty' | 'discount' | 'shipping';
    customerName: string;
    customerEmail: string;
    storeName: string;
    message: string;
    actionUrl?: string;
  },
  smtpConfig?: SmtpConfig
) {
  const { customerName, customerEmail, storeName, message, actionUrl } = data;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f6f7;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #202223; padding: 32px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">${storeName}</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="margin: 0 0 12px; color: #202223; font-size: 18px;">Hi ${customerName},</h2>
            <p style="margin: 0 0 20px; color: #6d7175; font-size: 14px; line-height: 1.6;">${message}</p>
            ${actionUrl ? `
              <a href="${actionUrl}" style="display: inline-block; background: #005bd3; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Continue
              </a>
            ` : ''}
          </div>
          <div style="background: #f6f6f7; padding: 24px; text-align: center;">
            <p style="margin: 0; color: #6d7175; font-size: 12px;">
              Questions? Reply to this email or contact us.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        const subject = `${storeName} Update`;
        return await sendEmail(customerEmail, subject, html, smtpConfig, storeName);
      } catch (error) {
      logger.error('sendApprovalNotificationEmail error:', error);
      return { success: false, error };
    }
  }

export async function sendLowStockAlertEmail(data: {
  merchantEmail: string;
  storeName: string;
  products: Array<{ name: string; sku?: string; stock_quantity: number; threshold: number }>;
}, smtpConfig?: SmtpConfig) {
  const { merchantEmail, storeName, products } = data;

  const productsHtml = products.map(product => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f1f1f1;">${product.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f1f1; text-align: center;">${product.sku || '-'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f1f1; text-align: center;">
        <span style="background: ${product.stock_quantity === 0 ? '#ffd2cc' : '#fff5cc'}; color: ${product.stock_quantity === 0 ? '#d82c0d' : '#b98900'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
          ${product.stock_quantity}
        </span>
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f6f7;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #b98900; padding: 32px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">⚠️ Low Stock Alert</h1>
          </div>
          
          <div style="padding: 32px;">
            <p style="margin: 0 0 24px; color: #6d7175; font-size: 14px;">
              The following products at <strong>${storeName}</strong> are running low on stock and need your attention:
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f6f6f7;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: #6d7175; text-transform: uppercase;">Product</th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; color: #6d7175; text-transform: uppercase;">SKU</th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; color: #6d7175; text-transform: uppercase;">Stock</th>
                </tr>
              </thead>
              <tbody>
                ${productsHtml}
              </tbody>
            </table>
            
            <div style="text-align: center;">
              <a href="#" style="display: inline-block; background: #008060; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Manage Inventory</a>
            </div>
          </div>
          
          <div style="background: #f6f6f7; padding: 24px; text-align: center;">
            <p style="margin: 0; color: #6d7175; font-size: 12px;">
              You're receiving this because low stock alerts are enabled in your store settings.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        const subject = `⚠️ Low Stock Alert - ${products.length} product${products.length > 1 ? 's' : ''} need attention`;
        return await sendEmail(merchantEmail, subject, html, smtpConfig, storeName);
      } catch (error) {
      logger.error('sendLowStockAlertEmail error:', error);
      return { success: false, error };
    }
  }

export async function sendNewOrderNotificationEmail(data: {
  merchantEmail: string;
  storeName: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  paymentMethod: string;
}, smtpConfig?: SmtpConfig) {
  const { merchantEmail, storeName, orderId, customerName, customerEmail, total, currency, items, paymentMethod } = data;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f1f1; font-size: 13px;">${item.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f1f1; text-align: center; font-size: 13px;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f1f1; text-align: right; font-size: 13px;">${formatCurrency(item.price * item.quantity, currency)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f6f7;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #008060; padding: 32px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">🎉 New Order Received!</h1>
          </div>
          
          <div style="padding: 32px;">
            <div style="background: #f1f8f5; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: #008060; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Order Total</p>
              <p style="margin: 0; color: #008060; font-size: 28px; font-weight: 700;">${formatCurrency(total, currency)}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <div style="background: #f6f6f7; border-radius: 8px; padding: 12px;">
                <p style="margin: 0 0 4px; color: #6d7175; font-size: 11px; text-transform: uppercase;">Order ID</p>
                <p style="margin: 0; color: #202223; font-size: 14px; font-weight: 600;">#${orderId.slice(0, 8).toUpperCase()}</p>
              </div>
              <div style="background: #f6f6f7; border-radius: 8px; padding: 12px;">
                <p style="margin: 0 0 4px; color: #6d7175; font-size: 11px; text-transform: uppercase;">Payment</p>
                <p style="margin: 0; color: #202223; font-size: 14px; font-weight: 600;">${paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 24px;">
              <p style="margin: 0 0 8px; color: #202223; font-size: 13px; font-weight: 600;">Customer</p>
              <p style="margin: 0; color: #6d7175; font-size: 13px;">${customerName}<br>${customerEmail}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f6f6f7;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #6d7175; text-transform: uppercase;">Item</th>
                  <th style="padding: 8px 12px; text-align: center; font-size: 11px; color: #6d7175; text-transform: uppercase;">Qty</th>
                  <th style="padding: 8px 12px; text-align: right; font-size: 11px; color: #6d7175; text-transform: uppercase;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          
          <div style="background: #f6f6f7; padding: 24px; text-align: center;">
            <a href="#" style="display: inline-block; background: #202223; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">View Order Details</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        const subject = `💰 New Order #${orderId.slice(0, 8).toUpperCase()} - ${formatCurrency(total, currency)}`;
        return await sendEmail(merchantEmail, subject, html, smtpConfig, storeName);
      } catch (error) {
      logger.error('sendNewOrderNotificationEmail error:', error);
      return { success: false, error };
    }
  }

export async function sendAbandonedCartEmail(data: {
  customerEmail: string;
  customerName?: string;
  storeName: string;
  storeUrl: string;
  items: Array<{ name: string; price: number; image_url?: string }>;
  total: number;
  currency: string;
}, smtpConfig?: SmtpConfig) {
  const { customerEmail, customerName, storeName, storeUrl, items, total, currency } = data;

  const itemsHtml = items.slice(0, 3).map(item => `
    <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f1f1;">
      ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 12px;">` : ''}
      <div>
        <p style="margin: 0; color: #202223; font-size: 14px; font-weight: 500;">${item.name}</p>
        <p style="margin: 4px 0 0; color: #6d7175; font-size: 13px;">${formatCurrency(item.price, currency)}</p>
      </div>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f6f7;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #202223; padding: 32px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">${storeName}</h1>
          </div>
          
          <div style="padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="font-size: 48px; margin-bottom: 16px;">🛒</div>
              <h2 style="margin: 0 0 8px; color: #202223; font-size: 20px;">You Left Something Behind!</h2>
              <p style="margin: 0; color: #6d7175; font-size: 14px;">
                ${customerName ? `Hey ${customerName}, ` : ''}Your cart is waiting for you.
              </p>
            </div>
            
            <div style="margin-bottom: 24px;">
              ${itemsHtml}
              ${items.length > 3 ? `<p style="color: #6d7175; font-size: 13px; margin: 12px 0 0;">+ ${items.length - 3} more items</p>` : ''}
            </div>
            
            <div style="text-align: center; margin-bottom: 24px;">
              <p style="margin: 0 0 16px; color: #202223; font-size: 18px; font-weight: 600;">Total: ${formatCurrency(total, currency)}</p>
              <a href="${storeUrl}" style="display: inline-block; background: #008060; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Complete Your Purchase</a>
            </div>
          </div>
          
          <div style="background: #f6f6f7; padding: 24px; text-align: center;">
            <p style="margin: 0; color: #6d7175; font-size: 12px;">
              If you have any questions, just reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

      try {
          const subject = `You left items in your cart at ${storeName}`;
          return await sendEmail(customerEmail, subject, html, smtpConfig, storeName);
        } catch (error) {
          logger.error('sendAbandonedCartEmail error:', error);
          return { success: false, error };
        }
  }

export async function sendPromotionalEmail(data: {
  customerEmail: string;
  customerName?: string;
  storeName: string;
  storeUrl: string;
  subject: string;
  previewText?: string;
  headline: string;
  bodyText: string;
  ctaText?: string;
  ctaUrl?: string;
  products?: Array<{ name: string; price: number; image_url?: string; sale_price?: number }>;
  currency: string;
  unsubscribeUrl?: string;
  campaignId?: string;
  recipientId?: string;
}, smtpConfig?: SmtpConfig) {
  const { 
    customerEmail, 
    customerName, 
    storeName, 
    storeUrl, 
    subject,
    previewText,
    headline,
    bodyText,
    ctaText,
    ctaUrl,
    products,
    currency,
    unsubscribeUrl,
    campaignId,
    recipientId
  } = data;

  // Build tracking URLs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://convos.sh';
  const trackingParams = campaignId ? `?c=${campaignId}${recipientId ? `&r=${recipientId}` : ''}` : '';
  const openTrackingPixel = campaignId ? `<img src="${baseUrl}/api/track/open${trackingParams}" width="1" height="1" style="display:none;" alt="" />` : '';
  
  const wrapLinkForTracking = (url: string) => {
    if (!campaignId) return url;
    return `${baseUrl}/api/track/click${trackingParams}&url=${encodeURIComponent(url)}`;
  };

  const trackedCtaUrl = ctaUrl ? wrapLinkForTracking(ctaUrl) : wrapLinkForTracking(storeUrl);
  const trackedStoreUrl = wrapLinkForTracking(storeUrl);

  const productsHtml = products && products.length > 0 ? products.slice(0, 4).map(product => `
    <div style="width: 48%; display: inline-block; vertical-align: top; margin-bottom: 16px; box-sizing: border-box;">
      ${product.image_url ? `
        <div style="background: #f6f6f7; border-radius: 8px; overflow: hidden; margin-bottom: 8px;">
          <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 140px; object-fit: cover;">
        </div>
      ` : ''}
      <p style="margin: 0 0 4px; color: #202223; font-size: 14px; font-weight: 500;">${product.name}</p>
      <p style="margin: 0; font-size: 13px;">
        ${product.sale_price ? `
          <span style="color: #d82c0d; font-weight: 600;">${formatCurrency(product.sale_price, currency)}</span>
          <span style="color: #6d7175; text-decoration: line-through; margin-left: 6px;">${formatCurrency(product.price, currency)}</span>
        ` : `
          <span style="color: #202223; font-weight: 600;">${formatCurrency(product.price, currency)}</span>
        `}
      </p>
    </div>
  `).join('') : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${previewText ? `<meta name="x-apple-disable-message-reformatting"><span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</span>` : ''}
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f6f7;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #202223; padding: 32px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">${storeName}</h1>
          </div>
          
          <div style="padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h2 style="margin: 0 0 12px; color: #202223; font-size: 24px; font-weight: 700; line-height: 1.3;">${headline}</h2>
              ${customerName ? `<p style="margin: 0 0 16px; color: #6d7175; font-size: 14px;">Hey ${customerName},</p>` : ''}
              <p style="margin: 0; color: #6d7175; font-size: 15px; line-height: 1.6;">${bodyText}</p>
            </div>
            
            ${ctaText ? `
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${trackedCtaUrl}" style="display: inline-block; background: #202223; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">${ctaText}</a>
              </div>
              ` : ''}
              
              ${productsHtml ? `
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px; color: #202223; font-size: 16px; font-weight: 600; text-align: center;">Featured Products</h3>
                <div style="text-align: center;">
                  ${productsHtml}
                </div>
              </div>
              ` : ''}
              
              ${!ctaText ? `
              <div style="text-align: center;">
                <a href="${trackedStoreUrl}" style="display: inline-block; background: #008060; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Shop Now</a>
              </div>
              ` : ''}
          </div>
          
          <div style="background: #f6f6f7; padding: 24px; text-align: center;">
            <p style="margin: 0 0 8px; color: #6d7175; font-size: 12px;">
              Questions? Reply to this email or visit our store.
            </p>
            ${unsubscribeUrl ? `
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from marketing emails
              </p>
              ` : ''}
              ${openTrackingPixel}
            </div>
        </div>
      </div>
    </body>
    </html>
  `;

      try {
        return await sendEmail(customerEmail, subject, html, smtpConfig, storeName);
      } catch (error) {
        logger.error('sendPromotionalEmail error:', error);
        return { success: false, error };
      }
  }

export { sendWithSmtp, resolveSmtpConfig, getPlatformSmtpConfig };
