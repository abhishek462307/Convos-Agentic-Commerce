import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseAdmin = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin,
}));

vi.mock('@/lib/agentic/events', () => ({
  logDomainEvent: vi.fn(),
}));

vi.mock('@/lib/agentic/runtime/processor', () => ({
  processMissionPlanById: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}));

let applyMissionApprovalAction: typeof import('@/lib/agentic/approvals').applyMissionApprovalAction;

function createPlanLookupQuery(data: any) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

beforeAll(async () => {
  ({ applyMissionApprovalAction } = await import('@/lib/agentic/approvals'));
});

beforeEach(() => {
  supabaseAdmin.from.mockReset();
});

describe('applyMissionApprovalAction', () => {
  it('rejects mission approvals when the plan is outside the merchant scope', async () => {
    supabaseAdmin.from.mockReturnValueOnce(createPlanLookupQuery(null));

    await expect(applyMissionApprovalAction({
      merchantId: 'merchant_1',
      planId: 'plan_other',
      action: 'approve',
    })).rejects.toThrow('Plan not found');
  });
});
