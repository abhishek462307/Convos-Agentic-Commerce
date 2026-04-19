import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  sendOrderConfirmationEmail,
  sendShippingUpdateEmail,
  sendApprovalNotificationEmail,
  sendLowStockAlertEmail,
  sendNewOrderNotificationEmail,
  sendAbandonedCartEmail,
  sendPromotionalEmail,
} from './email';

const smtpConfig = {
  smtp_enabled: true,
  smtp_host: 'smtp.test.com',
  smtp_port: 587,
  smtp_user: 'user@test.com',
  smtp_password: 'secret',
  smtp_from_email: 'noreply@test.com',
  smtp_from_name: 'Test Store',
};

const orderData = {
  orderId: '12345678-abcd',
  customerName: 'Alice',
  customerEmail: 'alice@example.com',
  storeName: 'Test Store',
  items: [{ name: 'Widget', quantity: 2, price: 15 }],
  subtotal: 30,
  shipping: 5,
  tax: 3,
  total: 38,
  currency: 'USD',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendOrderConfirmationEmail', () => {
  it('sends confirmation email with correct subject', async () => {
    const result = await sendOrderConfirmationEmail(orderData, smtpConfig);
    expect(result.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('alice@example.com');
    expect(call.subject).toContain('Order Confirmed');
    expect(call.subject).toContain('12345678');
    expect(call.html).toContain('Widget');
    expect(call.html).toContain('Alice');
  });

  it('includes shipping address when provided', async () => {
    const data = {
      ...orderData,
      shippingAddress: { address: '123 Main St', city: 'NYC', state: 'NY', country: 'US', postalCode: '10001' },
    };
    const result = await sendOrderConfirmationEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('123 Main St');
    expect(html).toContain('NYC');
  });

  it('returns failure when SMTP is not configured', async () => {
    const result = await sendOrderConfirmationEmail(orderData);
    expect(result.success).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('handles sendMail error gracefully', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));
    const result = await sendOrderConfirmationEmail(orderData, smtpConfig);
    expect(result.success).toBe(false);
  });
});

describe('sendShippingUpdateEmail', () => {
  it('sends shipped email with tracking info', async () => {
    const data = {
      ...orderData,
      status: 'shipped' as const,
      trackingNumber: 'TRK123',
      trackingUrl: 'https://track.test/TRK123',
    };
    const result = await sendShippingUpdateEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain('Shipped');
    expect(call.html).toContain('TRK123');
    expect(call.html).toContain('https://track.test/TRK123');
  });

  it('sends delivered email', async () => {
    const data = { ...orderData, status: 'delivered' as const };
    const result = await sendShippingUpdateEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain('Delivered');
    expect(call.html).toContain('Delivered');
  });
});

describe('sendApprovalNotificationEmail', () => {
  it('sends approval notification with action URL', async () => {
    const data = {
      type: 'refund' as const,
      customerName: 'Bob',
      customerEmail: 'bob@test.com',
      storeName: 'Test Store',
      message: 'Your refund has been approved.',
      actionUrl: 'https://store.test/refund/123',
    };
    const result = await sendApprovalNotificationEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain('refund has been approved');
    expect(call.html).toContain('https://store.test/refund/123');
    expect(call.html).toContain('Bob');
  });

  it('sends without action URL', async () => {
    const data = {
      type: 'discount' as const,
      customerName: 'Carol',
      customerEmail: 'carol@test.com',
      storeName: 'Test Store',
      message: 'You have a new discount.',
    };
    const result = await sendApprovalNotificationEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).not.toContain('href=');
  });
});

describe('sendLowStockAlertEmail', () => {
  it('sends low stock alert to merchant', async () => {
    const data = {
      merchantEmail: 'merchant@test.com',
      storeName: 'Test Store',
      products: [
        { name: 'Widget A', sku: 'WA-001', stock_quantity: 2, threshold: 5 },
        { name: 'Widget B', stock_quantity: 0, threshold: 10 },
      ],
    };
    const result = await sendLowStockAlertEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('merchant@test.com');
    expect(call.subject).toContain('Low Stock Alert');
    expect(call.subject).toContain('2 products');
    expect(call.html).toContain('Widget A');
    expect(call.html).toContain('WA-001');
    expect(call.html).toContain('Widget B');
  });

  it('singular subject for 1 product', async () => {
    const data = {
      merchantEmail: 'merchant@test.com',
      storeName: 'Store',
      products: [{ name: 'X', stock_quantity: 1, threshold: 5 }],
    };
    const result = await sendLowStockAlertEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const subject = mockSendMail.mock.calls[0][0].subject;
    expect(subject).toContain('1 product need');
    expect(subject).not.toContain('products');
  });
});

describe('sendNewOrderNotificationEmail', () => {
  it('sends new order notification to merchant', async () => {
    const data = {
      merchantEmail: 'merchant@test.com',
      storeName: 'Test Store',
      orderId: 'abcdef12-3456',
      customerName: 'Dave',
      customerEmail: 'dave@test.com',
      total: 99.99,
      currency: 'USD',
      items: [{ name: 'Gadget', quantity: 1, price: 99.99 }],
      paymentMethod: 'stripe',
    };
    const result = await sendNewOrderNotificationEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('merchant@test.com');
    expect(call.subject).toContain('New Order');
    expect(call.html).toContain('Dave');
    expect(call.html).toContain('Gadget');
  });

  it('formats COD payment method', async () => {
    const data = {
      merchantEmail: 'merchant@test.com',
      storeName: 'Store',
      orderId: '11112222',
      customerName: 'Eve',
      customerEmail: 'eve@test.com',
      total: 50,
      currency: 'INR',
      items: [{ name: 'Item', quantity: 1, price: 50 }],
      paymentMethod: 'cod',
    };
    await sendNewOrderNotificationEmail(data, smtpConfig);
    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('Cash on Delivery');
  });
});

describe('sendAbandonedCartEmail', () => {
  it('sends abandoned cart email with items', async () => {
    const data = {
      customerEmail: 'shopper@test.com',
      customerName: 'Frank',
      storeName: 'Test Store',
      storeUrl: 'https://store.test',
      items: [
        { name: 'Shirt', price: 25, image_url: 'https://img.test/shirt.jpg' },
        { name: 'Pants', price: 40 },
      ],
      total: 65,
      currency: 'USD',
    };
    const result = await sendAbandonedCartEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain('left items in your cart');
    expect(call.html).toContain('Shirt');
    expect(call.html).toContain('Frank');
    expect(call.html).toContain('https://store.test');
  });

  it('shows +N more when >3 items', async () => {
    const data = {
      customerEmail: 'a@b.com',
      storeName: 'Store',
      storeUrl: 'https://s.test',
      items: Array.from({ length: 5 }, (_, i) => ({ name: `Item ${i}`, price: 10 })),
      total: 50,
      currency: 'USD',
    };
    const result = await sendAbandonedCartEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('+ 2 more items');
  });
});

describe('sendPromotionalEmail', () => {
  it('sends promotional email with headline and CTA', async () => {
    const data = {
      customerEmail: 'promo@test.com',
      customerName: 'Grace',
      storeName: 'Test Store',
      storeUrl: 'https://store.test',
      subject: 'Big Sale!',
      headline: '50% Off Everything',
      bodyText: 'Shop our biggest sale of the year.',
      ctaText: 'Shop Now',
      ctaUrl: 'https://store.test/sale',
      currency: 'USD',
    };
    const result = await sendPromotionalEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toBe('Big Sale!');
    expect(call.html).toContain('50% Off Everything');
    expect(call.html).toContain('Shop Now');
    expect(call.html).toContain('Grace');
  });

  it('includes featured products with sale prices', async () => {
    const data = {
      customerEmail: 'promo@test.com',
      storeName: 'Store',
      storeUrl: 'https://store.test',
      subject: 'Deals',
      headline: 'Deals!',
      bodyText: 'Check out these deals.',
      products: [
        { name: 'Widget', price: 50, sale_price: 35, image_url: 'https://img.test/w.jpg' },
      ],
      currency: 'USD',
    };
    const result = await sendPromotionalEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('Widget');
    expect(html).toContain('Featured Products');
  });

  it('includes tracking pixel when campaignId provided', async () => {
    const data = {
      customerEmail: 'track@test.com',
      storeName: 'Store',
      storeUrl: 'https://store.test',
      subject: 'Campaign',
      headline: 'Track Me',
      bodyText: 'Body',
      currency: 'USD',
      campaignId: 'camp-123',
      recipientId: 'rcpt-456',
    };
    const result = await sendPromotionalEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('/api/track/open');
    expect(html).toContain('camp-123');
    expect(html).toContain('rcpt-456');
  });

  it('includes unsubscribe link when provided', async () => {
    const data = {
      customerEmail: 'unsub@test.com',
      storeName: 'Store',
      storeUrl: 'https://store.test',
      subject: 'Marketing',
      headline: 'Hi',
      bodyText: 'Body',
      currency: 'USD',
      unsubscribeUrl: 'https://store.test/unsubscribe/abc',
    };
    const result = await sendPromotionalEmail(data, smtpConfig);
    expect(result.success).toBe(true);
    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('https://store.test/unsubscribe/abc');
    expect(html).toContain('Unsubscribe');
  });
});
