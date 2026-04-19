import { describe, expect, it } from 'vitest';
import { validateCheckoutForm, calculateOrderTotals } from '@/lib/checkout-utils';

describe('validateCheckoutForm', () => {
  const validForm = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+919876543210',
    address: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'IN',
  };

  it('returns no errors for a valid form', () => {
    const errors = validateCheckoutForm(validForm);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('requires name', () => {
    const errors = validateCheckoutForm({ ...validForm, name: '' });
    expect(errors.name).toBe('Name is required');
  });

  it('validates email format', () => {
    const errors = validateCheckoutForm({ ...validForm, email: 'bad-email' });
    expect(errors.email).toBe('Invalid email');
  });

  it('requires state for India', () => {
    const errors = validateCheckoutForm({ ...validForm, country: 'IN', state: '' });
    expect(errors.state).toBe('State is required');
  });

  it('does not require state for non-Indian countries', () => {
    const errors = validateCheckoutForm({ ...validForm, country: 'US', state: '' });
    expect(errors.state).toBeUndefined();
  });
});

describe('calculateOrderTotals', () => {
  const cart = [
    { name: 'Shirt', price: 100, quantity: 2, bargainedPrice: null },
    { name: 'Hat', price: 50, quantity: 1, bargainedPrice: 40 },
  ];

  it('calculates subtotal including bargained prices', () => {
    const result = calculateOrderTotals(cart, null, null, 'US');
    expect(result.subtotal).toBe(240);
  });

  it('applies percentage discount', () => {
    const discount = { discountType: 'percentage', discountValue: 10, excludeBargainedItems: false };
    const result = calculateOrderTotals(cart, discount, null, 'US');
    expect(result.discountAmount).toBe(24);
  });

  it('excludes bargained items from discount when configured', () => {
    const discount = { discountType: 'percentage', discountValue: 10, excludeBargainedItems: true };
    const result = calculateOrderTotals(cart, discount, null, 'US');
    expect(result.discountAmount).toBe(20);
  });

  it('applies flat discount capped at subtotal', () => {
    const discount = { discountType: 'flat', discountValue: 500, excludeBargainedItems: false };
    const result = calculateOrderTotals(cart, discount, null, 'US');
    expect(result.discountAmount).toBe(240);
  });

  it('calculates tax based on country rate', () => {
    const taxSettings = {
      enabled: true,
      default_rate: 5,
      include_in_price: false,
      country_rates: [{ country_code: 'US', country_name: 'United States', rate: 8 }],
    };
    const result = calculateOrderTotals(cart, null, taxSettings, 'US');
    expect(result.taxRate).toBe(8);
    expect(result.taxAmount).toBeCloseTo(19.2);
  });

  it('uses default tax rate when country not found', () => {
    const taxSettings = {
      enabled: true,
      default_rate: 5,
      include_in_price: false,
      country_rates: [],
    };
    const result = calculateOrderTotals(cart, null, taxSettings, 'IN');
    expect(result.taxRate).toBe(5);
    expect(result.taxAmount).toBeCloseTo(12);
  });

  it('includes shipping in total', () => {
    const result = calculateOrderTotals(cart, null, null, 'US', 15);
    expect(result.total).toBe(255);
  });
});
