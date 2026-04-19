import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows requests under the limit', () => {
    const result = rateLimit('test-ip-1', { maxRequests: 5, windowMs: 60000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('tracks multiple requests and decrements remaining', () => {
    for (let i = 0; i < 3; i++) {
      rateLimit('test-ip-2', { maxRequests: 5, windowMs: 60000 });
    }
    const result = rateLimit('test-ip-2', { maxRequests: 5, windowMs: 60000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('blocks requests over the limit', () => {
    for (let i = 0; i < 5; i++) {
      rateLimit('test-ip-3', { maxRequests: 5, windowMs: 60000 });
    }
    const result = rateLimit('test-ip-3', { maxRequests: 5, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after the window expires', () => {
    for (let i = 0; i < 5; i++) {
      rateLimit('test-ip-4', { maxRequests: 5, windowMs: 1000 });
    }
    const blocked = rateLimit('test-ip-4', { maxRequests: 5, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(1500);

    const afterReset = rateLimit('test-ip-4', { maxRequests: 5, windowMs: 1000 });
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(4);
  });

  it('isolates different keys', () => {
    for (let i = 0; i < 5; i++) {
      rateLimit('ip-a', { maxRequests: 5, windowMs: 60000 });
    }
    const blockedA = rateLimit('ip-a', { maxRequests: 5, windowMs: 60000 });
    expect(blockedA.allowed).toBe(false);

    const freshB = rateLimit('ip-b', { maxRequests: 5, windowMs: 60000 });
    expect(freshB.allowed).toBe(true);
  });

  it('uses default values when no options provided', () => {
    const result = rateLimit('test-ip-defaults');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });
});
