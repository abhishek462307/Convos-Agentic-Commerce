import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {},
}));

let getRetryDelayMs: typeof import('@/lib/agentic/runtime/utils').getRetryDelayMs;

beforeAll(async () => {
  ({ getRetryDelayMs } = await import('@/lib/agentic/runtime/utils'));
});

describe('getRetryDelayMs', () => {
  it('backs off retry timing as attempts increase', () => {
    expect(getRetryDelayMs(1)).toBe(60_000);
    expect(getRetryDelayMs(2)).toBe(120_000);
    expect(getRetryDelayMs(3)).toBe(240_000);
  });

  it('caps retry delay at one hour', () => {
    expect(getRetryDelayMs(10)).toBe(60 * 60 * 1000);
  });
});
