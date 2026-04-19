import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseAdmin = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin,
}));

vi.mock('@/lib/agentic/events', () => ({
  logDomainEvent: vi.fn(),
  listMerchantAgentEvents: vi.fn(),
}));

vi.mock('@/lib/agentic/planner', () => ({
  MissionPlanner: {
    planMission: vi.fn(),
  },
}));

vi.mock('@/lib/agentic/approvals', () => ({
  buildMissionApprovalItem: vi.fn(),
  listPendingDecisionApprovals: vi.fn(),
}));

vi.mock('@/lib/agentic/runtime/processor', () => ({
  processMissionPlanById: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

let listMerchantMissions: typeof import('@/lib/agentic/missions').listMerchantMissions;
let pauseMissionPlan: typeof import('@/lib/agentic/missions').pauseMissionPlan;

function createIntentsQuery(data: any[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data }),
  };
}

function createPlansQuery(data: any[]) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data }),
  };
}

function createLatestPlanQuery(data: any[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data }),
  };
}

function createUpdateQuery() {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
}

beforeAll(async () => {
  ({ listMerchantMissions, pauseMissionPlan } = await import('@/lib/agentic/missions'));
});

beforeEach(() => {
  supabaseAdmin.from.mockReset();
});

describe('mission data access', () => {
  it('scopes mission plan lookup to the merchant intent ids on list pages', async () => {
    const intentsQuery = createIntentsQuery([
      {
        id: 'intent_1',
        consumer_email: 'owner@example.com',
        intent_type: 'catalog_cleanup',
        goal: 'Fix product pages',
        status: 'active',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
        constraints: null,
      },
    ]);
    const plansQuery = createPlansQuery([
      {
        id: 'plan_1',
        intent_id: 'intent_1',
        steps: ['Audit catalog'],
        current_step: 0,
        status: 'planning',
        is_approved: false,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
    ]);

    supabaseAdmin.from
      .mockReturnValueOnce(intentsQuery)
      .mockReturnValueOnce(plansQuery);

    const missions = await listMerchantMissions('merchant_1', { limit: 20 });

    expect(plansQuery.in).toHaveBeenCalledWith('intent_id', ['intent_1']);
    expect(missions).toHaveLength(1);
    expect(missions[0]?.planId).toBe('plan_1');
  });

  it('refuses to pause a mission that does not belong to the merchant', async () => {
    const latestPlanQuery = createLatestPlanQuery([]);
    const planUpdateQuery = createUpdateQuery();
    const intentUpdateQuery = createUpdateQuery();

    supabaseAdmin.from
      .mockReturnValueOnce(latestPlanQuery)
      .mockReturnValueOnce(planUpdateQuery)
      .mockReturnValueOnce(intentUpdateQuery);

    await expect(pauseMissionPlan('merchant_1', 'intent_404')).rejects.toThrow('Mission not found or you do not have permission');
    expect(planUpdateQuery.update).not.toHaveBeenCalled();
    expect(intentUpdateQuery.update).not.toHaveBeenCalled();
  });
});
