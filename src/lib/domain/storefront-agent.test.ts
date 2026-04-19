import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {},
}));

vi.mock('@/lib/embeddings', () => ({
  semanticSearch: vi.fn(),
}));

vi.mock('@/app/api/ai/azure-client', () => ({
  logAIDecision: vi.fn(),
}));

let buildProductDecisionSupport: typeof import('@/lib/domain/storefront-agent').buildProductDecisionSupport;

beforeAll(async () => {
  ({ buildProductDecisionSupport } = await import('@/lib/domain/storefront-agent'));
});

describe('buildProductDecisionSupport', () => {
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  it('adds commerce highlights and matching reasons for recommendation cards', () => {
    const product = buildProductDecisionSupport({
      id: 'prod_1',
      name: 'Canvas Travel Bag',
      description: 'Durable weekender bag with smart compartments.',
      category: 'Bags',
      price: 80,
      compare_at_price: 100,
      bargain_enabled: true,
      stock_quantity: 4,
      track_quantity: true,
      review_count: 12,
      rating: 4.8,
      popularity_reason: 'best seller',
    }, {
      formatPrice,
      query: 'travel bag',
      maxPrice: 100,
      source: 'popular',
    });

    expect(product.ai_reason).toContain('fits your search closely');
    expect(product.ai_highlights).toContain('20% off');
    expect(product.ai_highlights).toContain('bargainable');
    expect(product.ai_tradeoff).toContain('$80.00');
  });

  it('falls back to a details-focused reason when query signals are absent', () => {
    const product = buildProductDecisionSupport({
      id: 'prod_2',
      name: 'Minimal Desk Lamp',
      description: 'Warm light for night reading.',
      category: 'Lighting',
      price: 45,
      stock_quantity: 20,
      track_quantity: true,
    }, {
      formatPrice,
      source: 'details',
    });

    expect(product.ai_reason).toBe('good fit based on the current product details');
    expect(product.ai_highlights).toEqual([]);
  });
});
