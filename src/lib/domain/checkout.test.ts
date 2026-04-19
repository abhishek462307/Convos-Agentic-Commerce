import { describe, expect, it } from 'vitest';
import {
  buildCheckoutPaymentDetails,
  buildCheckoutReturnUrls,
  calculateCheckoutTotals,
  resolveApplicableDiscount,
  resolveManualShippingRate,
  sanitizeCheckoutCart,
  validateStorefrontCheckoutCart,
} from '@/lib/domain/checkout';

describe('checkout domain helpers', () => {
  it('sanitizes the incoming cart', () => {
    expect(
      sanitizeCheckoutCart([
        { id: 'p1', quantity: '2.9' },
        { id: 'p2', quantity: 0 },
        null,
        { id: 'p3', quantity: 1 },
      ])
    ).toEqual([
      { id: 'p1', quantity: 2 },
      { id: 'p3', quantity: 1 },
    ]);
  });

  it('resolves a manual shipping rate from the matching zone', () => {
    expect(
      resolveManualShippingRate({
        shippingSettings: {
          zones: [
            {
              id: 'zone-us',
              name: 'United States',
              countries: ['US'],
              rates: [
                { id: 'standard', name: 'Standard', price: 10 },
                { id: 'express', name: 'Express', price: 25 },
              ],
            },
          ],
        },
        customerCountry: 'US',
        shippingRateId: 'express',
      })
    ).toEqual({
      shipping: 25,
      shippingZoneName: 'United States',
      shippingRateName: 'Express',
    });
  });

  it('calculates totals with bargain savings and percentage discounts', () => {
    const totals = calculateCheckoutTotals({
      validatedCart: [
        { id: 'p1', name: 'Bag', quantity: 2, price: 100, variant_id: null, variant_name: null },
      ],
      bargainedPrices: [{ product_id: 'p1', original_price: 100, bargained_price: 80 }],
      appliedDiscount: { type: 'percentage', value: 10 },
      shipping: 20,
      taxSettings: {
        enabled: true,
        default_rate: 5,
        include_in_price: false,
        country_rates: [{ country_code: 'US', country_name: 'United States', rate: 5 }],
      },
      customerCountry: 'US',
    });

    expect(totals.subtotal).toBe(160);
    expect(totals.bargainSavings).toBe(40);
    expect(totals.discountAmount).toBe(16);
    expect(totals.tax).toBeCloseTo(7.2);
    expect(totals.total).toBeCloseTo(171.2);
  });

  it('builds payment details with bargain and discount metadata', () => {
    expect(
      buildCheckoutPaymentDetails({
        appliedDiscount: {
          id: 'd1',
          merchant_id: 'm1',
          code: 'SAVE10',
          type: 'percentage',
          value: 10,
        },
        discountAmount: 10,
        bargainedPrices: [
          { product_id: 'p1', original_price: 100, bargained_price: 90, discount_percentage: 10 },
        ],
        bargainSavings: 10,
        hasBargainedItems: true,
        sessionId: 'sess_123',
      })
    ).toEqual({
      discount_applied: 'SAVE10',
      discount_amount: 10,
      discount_id: 'd1',
      bargained_items: [
        { product_id: 'p1', original_price: 100, bargained_price: 90, discount_percentage: 10 },
      ],
      bargain_savings: 10,
      bargain_session_id: 'sess_123',
    });
  });

  it('builds storefront return urls for main domains', () => {
    expect(
      buildCheckoutReturnUrls({
        origin: 'https://your-domain.com',
        host: 'your-domain.com',
        subdomain: 'artisan',
        orderId: 'order_1',
      })
    ).toEqual({
      successUrl: 'https://your-domain.com/checkout?success=true&order_id=order_1',
      cancelUrl: 'https://your-domain.com/checkout?canceled=true&order_id=order_1',
    });
  });

  it('validates storefront cart items against products and variants', () => {
    const result = validateStorefrontCheckoutCart({
      sanitizedCart: [
        { id: 'p1', quantity: 2, variant: { id: 'v1' }, variantName: 'Large' },
      ],
      products: [
        { id: 'p1', name: 'Coffee', price: 10, stock_quantity: 10, track_quantity: true, status: 'active' },
      ],
      variants: [
        { id: 'v1', product_id: 'p1', price: 12, stock_quantity: 4, name: 'Large' },
      ],
    });

    expect(result.validatedCart).toEqual([
      {
        id: 'p1',
        name: 'Coffee',
        image_url: undefined,
        category: undefined,
        quantity: 2,
        price: 12,
        variant_id: 'v1',
        variant_name: 'Large',
      },
    ]);
  });

  it('resolves only valid non-bargained discounts', () => {
    expect(
      resolveApplicableDiscount({
        discount: {
          id: 'd1',
          merchant_id: 'm1',
          code: 'SAVE10',
          type: 'percentage',
          value: 10,
          ends_at: new Date(Date.now() + 60_000).toISOString(),
          usage_limit: 10,
          used_count: 1,
          min_order_amount: 20,
        },
        subtotal: 30,
        hasBargainedItems: false,
      })
    ).toMatchObject({ id: 'd1' });

    expect(
      resolveApplicableDiscount({
        discount: {
          id: 'd2',
          merchant_id: 'm1',
          code: 'SAVE10',
          type: 'percentage',
          value: 10,
          ends_at: new Date(Date.now() + 60_000).toISOString(),
          usage_limit: 10,
          used_count: 1,
          min_order_amount: 20,
        },
        subtotal: 30,
        hasBargainedItems: true,
      })
    ).toBeNull();
  });
});
