import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {},
}));

let getBillingCycle: typeof import('@/lib/domain/stripe-webhooks').getBillingCycle;
let getPlanFromSubscription: typeof import('@/lib/domain/stripe-webhooks').getPlanFromSubscription;

beforeAll(async () => {
  ({ getBillingCycle, getPlanFromSubscription } = await import('@/lib/domain/stripe-webhooks'));
});

describe('stripe webhook helpers', () => {
  it('maps known platform prices to plans', () => {
    expect(
      getPlanFromSubscription({
        items: {
          data: [
            {
              price: {
                id: 'price_1Sr3OmCvDmWnHanPXD765UOt',
                recurring: { interval: 'month' },
              },
            },
          ],
        },
        metadata: {},
      } as any)
    ).toBe('pro');
  });

  it('falls back to metadata plan when needed', () => {
    expect(
      getPlanFromSubscription({
        items: { data: [] },
        metadata: { plan_type: 'professional' },
      } as any)
    ).toBe('pro');
  });

  it('derives yearly and monthly billing cycles', () => {
    expect(
      getBillingCycle({
        items: { data: [{ price: { recurring: { interval: 'year' } } }] },
      } as any)
    ).toBe('yearly');

    expect(
      getBillingCycle({
        items: { data: [{ price: { recurring: { interval: 'month' } } }] },
      } as any)
    ).toBe('monthly');
  });
});
