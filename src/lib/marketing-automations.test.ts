import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-admin', () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockResolvedValue({ data: null });
  const mockUpdate = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockResolvedValue({ data: null });
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    update: mockUpdate,
    insert: mockInsert,
  }));
  return {
    supabaseAdmin: { from: mockFrom },
    _mocks: { mockFrom, mockSelect, mockEq, mockSingle, mockUpdate, mockInsert },
  };
});

vi.mock('@/lib/email', () => ({
  sendAbandonedCartEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPromotionalEmail: vi.fn().mockResolvedValue({ success: true }),
  sendShippingUpdateEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { triggerAutomation, type AutomationTrigger } from './marketing-automations';
import { sendAbandonedCartEmail, sendPromotionalEmail, sendShippingUpdateEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-admin';

const MERCHANT_ID = 'merchant-1';
const MERCHANT_ROW = {
  store_name: 'Test Store',
  subdomain: 'test',
  currency: 'USD',
  smtp_enabled: true,
  smtp_host: 'smtp.test.com',
  smtp_port: 587,
  smtp_user: 'user',
  smtp_password: 'pass',
  smtp_from_email: 'hello@test.com',
  smtp_from_name: 'Test Store',
};
const AUTOMATION_ROW = {
  id: 'auto-1',
  merchant_id: MERCHANT_ID,
  trigger_type: 'cart_abandoned',
  status: 'active',
  stats: { runs: 5, conversions: 3 },
};

function setupMocks(automations: any[] | null, merchant: any | null) {
  let callIndex = 0;
  (supabaseAdmin.from as any).mockImplementation((table: string) => {
    if (table === 'marketing_automations' && callIndex === 0) {
      callIndex++;
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: automations }),
            }),
          }),
        }),
      };
    }
    if (table === 'merchants') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: merchant }),
          }),
        }),
      };
    }
    if (table === 'marketing_automations') {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null }),
        }),
      };
    }
    if (table === 'marketing_logs') {
      return {
        insert: vi.fn().mockResolvedValue({ data: null }),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('triggerAutomation', () => {
  it('does nothing when no active automations exist', async () => {
    setupMocks([], MERCHANT_ROW);
    await triggerAutomation('cart_abandoned', MERCHANT_ID, { email: 'a@b.com' });
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
    expect(sendPromotionalEmail).not.toHaveBeenCalled();
  });

  it('does nothing when automations is null', async () => {
    setupMocks(null, MERCHANT_ROW);
    await triggerAutomation('cart_abandoned', MERCHANT_ID, { email: 'a@b.com' });
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
  });

  it('does nothing when merchant is not found', async () => {
    setupMocks([AUTOMATION_ROW], null);
    await triggerAutomation('cart_abandoned', MERCHANT_ID, { email: 'a@b.com' });
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
  });

  it('sends abandoned cart email for cart_abandoned trigger', async () => {
    setupMocks([AUTOMATION_ROW], MERCHANT_ROW);
    await triggerAutomation('cart_abandoned', MERCHANT_ID, {
      email: 'customer@test.com',
      name: 'Alice',
      items: [{ name: 'Shirt', price: 29.99, image_url: 'https://img.test/shirt.jpg' }],
      total: 29.99,
    });
    expect(sendAbandonedCartEmail).toHaveBeenCalledOnce();
    const call = (sendAbandonedCartEmail as any).mock.calls[0];
    expect(call[0].customerEmail).toBe('customer@test.com');
    expect(call[0].items).toHaveLength(1);
    expect(call[0].total).toBe(29.99);
    expect(call[1]).toBeDefined();
    expect(call[1].smtp_host).toBe('smtp.test.com');
  });

  it('sends promotional email for new_subscriber trigger', async () => {
    setupMocks([{ ...AUTOMATION_ROW, trigger_type: 'new_subscriber' }], MERCHANT_ROW);
    await triggerAutomation('new_subscriber', MERCHANT_ID, {
      email: 'new@test.com',
      name: 'Bob',
    });
    expect(sendPromotionalEmail).toHaveBeenCalledOnce();
    const call = (sendPromotionalEmail as any).mock.calls[0];
    expect(call[0].customerEmail).toBe('new@test.com');
    expect(call[0].subject).toContain('Welcome');
  });

  it('sends promotional email for order_completed trigger', async () => {
    setupMocks([{ ...AUTOMATION_ROW, trigger_type: 'order_completed' }], MERCHANT_ROW);
    await triggerAutomation('order_completed', MERCHANT_ID, {
      email: 'buyer@test.com',
      name: 'Carol',
    });
    expect(sendPromotionalEmail).toHaveBeenCalledOnce();
    const call = (sendPromotionalEmail as any).mock.calls[0];
    expect(call[0].subject).toContain('Thank you');
  });

  it('sends promotional email for price_drop trigger', async () => {
    setupMocks([{ ...AUTOMATION_ROW, trigger_type: 'price_drop' }], MERCHANT_ROW);
    await triggerAutomation('price_drop', MERCHANT_ID, {
      email: 'deal@test.com',
      name: 'Dave',
      productName: 'Widget',
      oldPrice: '$50',
      newPrice: '$35',
    });
    expect(sendPromotionalEmail).toHaveBeenCalledOnce();
    const call = (sendPromotionalEmail as any).mock.calls[0];
    expect(call[0].subject).toContain('Price Drop');
    expect(call[0].bodyText).toContain('Widget');
  });

  it('sends shipping update email for shipping_update trigger', async () => {
    setupMocks([{ ...AUTOMATION_ROW, trigger_type: 'shipping_update' }], MERCHANT_ROW);
    await triggerAutomation('shipping_update', MERCHANT_ID, {
      email: 'ship@test.com',
      name: 'Eve',
      orderId: 'order-123',
      items: [{ name: 'Widget', price: 50, quantity: 1 }],
      subtotal: 50,
      shipping: 5,
      tax: 4,
      total: 59,
      shippingStatus: 'shipped',
      trackingNumber: 'TRK123',
      trackingUrl: 'https://track.test/TRK123',
    });
    expect(sendShippingUpdateEmail).toHaveBeenCalledOnce();
    const call = (sendShippingUpdateEmail as any).mock.calls[0];
    expect(call[0].orderId).toBe('order-123');
    expect(call[0].status).toBe('shipped');
    expect(call[0].trackingNumber).toBe('TRK123');
  });

  it('sends promotional email for reengagement trigger', async () => {
    setupMocks([{ ...AUTOMATION_ROW, trigger_type: 'reengagement' }], MERCHANT_ROW);
    await triggerAutomation('reengagement', MERCHANT_ID, {
      email: 'old@test.com',
      name: 'Frank',
    });
    expect(sendPromotionalEmail).toHaveBeenCalledOnce();
    const call = (sendPromotionalEmail as any).mock.calls[0];
    expect(call[0].subject).toContain('miss you');
  });

  it('skips sending when payload has no email', async () => {
    setupMocks([AUTOMATION_ROW], MERCHANT_ROW);
    await triggerAutomation('cart_abandoned', MERCHANT_ID, { name: 'NoEmail' });
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
    expect(sendPromotionalEmail).not.toHaveBeenCalled();
  });

  it('passes undefined smtp config when merchant has no SMTP', async () => {
    const noSmtpMerchant = { ...MERCHANT_ROW, smtp_enabled: false };
    setupMocks([{ ...AUTOMATION_ROW, trigger_type: 'new_subscriber' }], noSmtpMerchant);
    await triggerAutomation('new_subscriber', MERCHANT_ID, {
      email: 'a@b.com',
      name: 'Test',
    });
    expect(sendPromotionalEmail).toHaveBeenCalledOnce();
    const call = (sendPromotionalEmail as any).mock.calls[0];
    expect(call[1]).toBeUndefined();
  });

  it('handles cart_abandoned items with missing fields gracefully', async () => {
    setupMocks([AUTOMATION_ROW], MERCHANT_ROW);
    await triggerAutomation('cart_abandoned', MERCHANT_ID, {
      email: 'a@b.com',
      items: [{ }, { name: 'Existing' }],
      total: 10,
    });
    expect(sendAbandonedCartEmail).toHaveBeenCalledOnce();
    const call = (sendAbandonedCartEmail as any).mock.calls[0];
    expect(call[0].items[0].name).toBe('Product');
    expect(call[0].items[0].price).toBe(0);
    expect(call[0].items[1].name).toBe('Existing');
  });
});
