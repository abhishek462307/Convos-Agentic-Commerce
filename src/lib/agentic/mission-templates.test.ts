import { describe, expect, it } from 'vitest';
import { buildMissionBriefFromPrompt, createMissionBlueprint, DEFAULT_AGENT_SUGGESTIONS, inferMissionGoalTypeFromPrompt } from '@/lib/agentic/mission-templates';

describe('createMissionBlueprint', () => {
  it('builds autonomous increase-aov missions', () => {
    const blueprint = createMissionBlueprint('increase_aov');

    expect(blueprint.scope).toBe('marketing');
    expect(blueprint.requiresApproval).toBe(false);
    expect(blueprint.steps.length).toBeGreaterThan(1);
  });

  it('keeps support triage behind approval', () => {
    const blueprint = createMissionBlueprint('support_triage');

    expect(blueprint.scope).toBe('support');
    expect(blueprint.requiresApproval).toBe(true);
  });

  it('exposes merchant command suggestions', () => {
    expect(DEFAULT_AGENT_SUGGESTIONS.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_AGENT_SUGGESTIONS.some((item) => item.goalType === 'recover_abandoned_carts')).toBe(true);
  });

  it('keeps unclear missions in analysis-only mode', () => {
    const brief = buildMissionBriefFromPrompt('Help me improve the store somehow');

    expect(brief.executionMode).toBe('analysis_only');
    expect(brief.interpretationConfidence).toBeLessThan(0.7);
    expect(brief.interpretationWarnings?.length).toBeGreaterThan(0);
  });

  it('keeps explicit product-copy missions actionable', () => {
    const brief = buildMissionBriefFromPrompt('Rewrite product descriptions for slow-moving coffee grinders');

    expect(inferMissionGoalTypeFromPrompt('Rewrite product descriptions for slow-moving coffee grinders')).toBe('catalog_cleanup');
    expect(brief.executionMode).toBe('actionable');
    expect(brief.interpretationConfidence).toBeGreaterThanOrEqual(0.7);
  });

  it('keeps concrete custom catalog tasks actionable even without an exact keyword match', () => {
    const brief = buildMissionBriefFromPrompt('Audit underperforming SKUs and prepare pricing fixes for the worst listings');

    expect(brief.interpretedType).toBe('catalog_cleanup');
    expect(brief.executionMode).toBe('actionable');
    expect(brief.interpretationConfidence).toBeGreaterThanOrEqual(0.7);
  });

  it('keeps the merchant-facing title anchored to the user task for custom prompts', () => {
    const brief = buildMissionBriefFromPrompt('can you increase the stock of all products to 100');

    expect(brief.merchantFacingTitle.toLowerCase()).toContain('increase the stock of all products to 100');
    expect(brief.merchantFacingTitle).not.toBe('Clear dead inventory');
  });

  it('marks unsupported direct inventory quantity changes as analysis-only', () => {
    const brief = buildMissionBriefFromPrompt('Increase the stock of all products to 100');

    expect(brief.executionMode).toBe('analysis_only');
    expect(brief.interpretationWarnings?.some((warning) => warning.includes('Direct stock-quantity updates'))).toBe(true);
  });
});
