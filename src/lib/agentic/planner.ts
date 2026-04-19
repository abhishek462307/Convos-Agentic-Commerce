import { callAI, getMerchantAIConfig, getMessageFromResponse } from '@/app/api/ai/ai-client';
import { buildMissionBriefFromPrompt, inferMissionGoalTypeFromPrompt } from './mission-templates';
import { listMissionActionDefinitions, listMissionCapabilities, validateMissionActionInvocation } from '@/lib/agentic/runtime/action-registry';
import logger from '@/lib/logger';
import type {
  Merchant,
  MerchantMissionBrief,
  MissionActionInvocation,
  MissionCapabilityStatus,
  MissionPlanDocument,
  MissionPlanFeasibility,
  MissionPlanStep,
} from '@/types';

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  const directCandidates = [trimmed];
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    directCandidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of directCandidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

function toTaskTitle(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, ' ').replace(/[.?!]+$/g, '');
  if (!normalized) {
    return 'Custom merchant mission';
  }

  const sentence = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return sentence.length <= 72 ? sentence : `${sentence.slice(0, 69).trimEnd()}...`;
}

function buildInventoryFallback(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  const stockMatch = normalized.match(/(?:to|at)\s+(\d+)/) || normalized.match(/(\d+)\s*(?:units|pcs|pieces)?/);
  if (!/(stock|inventory)/.test(normalized) || !/(increase|decrease|set|update|change|make|raise|lower)/.test(normalized) || !stockMatch) {
    return null;
  }

  const stockQuantity = Number(stockMatch[1]);
  const action: MissionActionInvocation = {
    id: 'action_set_inventory',
    actionId: 'bulk_update_inventory',
    title: `Set stock quantity to ${stockQuantity}`,
    reasoning: 'The merchant explicitly asked to change inventory levels.',
    readOnly: false,
    approvalRequired: true,
    riskLevel: 'high',
    input: {
      selection: { allActive: true },
      stockQuantity,
    },
  };

  return {
    title: toTaskTitle(prompt),
    interpretedObjective: `Set stock quantity to ${stockQuantity} for matching active products.`,
    executionStrategy: 'Review the current catalog selection, then apply a bulk inventory update after approval.',
    feasibility: 'executable' as MissionPlanFeasibility,
    capabilities: [
      {
        capabilityId: 'bulk_update_inventory',
        label: 'Update inventory quantities',
        status: 'requires_approval',
      } satisfies MissionCapabilityStatus,
    ],
    blockingCapabilities: [] as string[],
    likelyOutputs: ['Catalog selection summary', 'Bulk inventory update preview', 'Applied inventory change result'],
    steps: [
      {
        id: 'step_review_inventory_scope',
        title: 'Review matching active products',
        reasoning: 'Confirm the target catalog slice before changing stock levels.',
        kind: 'analysis',
        approvalRequired: false,
        expectedOutput: 'A product selection summary.',
      },
      {
        id: 'step_apply_inventory_update',
        title: `Set stock quantity to ${stockQuantity}`,
        reasoning: 'Apply the requested inventory level after merchant approval.',
        kind: 'action',
        actionId: action.id,
        approvalRequired: true,
        expectedOutput: 'Updated stock quantities for the approved products.',
      },
    ] satisfies MissionPlanStep[],
    actions: [
      {
        id: 'action_review_inventory_scope',
        actionId: 'inspect_products',
        title: 'Inspect matching active products',
        reasoning: 'Read the current product set before making inventory changes.',
        readOnly: true,
        approvalRequired: false,
        riskLevel: 'low',
        input: {
          selection: { allActive: true },
          limit: 25,
        },
      },
      action,
    ] satisfies MissionActionInvocation[],
  };
}

function fallbackOpenEndedPlan(prompt: string): MissionPlanDocument {
  const inventoryPlan = buildInventoryFallback(prompt);
  if (inventoryPlan) {
    return {
      planVersion: 2,
      requestedTask: prompt.trim(),
      interpretedObjective: inventoryPlan.interpretedObjective,
      executionStrategy: inventoryPlan.executionStrategy,
      feasibility: inventoryPlan.feasibility,
      requiredCapabilities: inventoryPlan.capabilities,
      blockingCapabilities: inventoryPlan.blockingCapabilities,
      steps: inventoryPlan.steps,
      actions: inventoryPlan.actions,
      approvals: [],
      results: [],
    };
  }

  const heuristicBrief = buildMissionBriefFromPrompt(prompt, inferMissionGoalTypeFromPrompt(prompt));
  return {
    planVersion: 2,
    requestedTask: prompt.trim(),
    interpretedObjective: heuristicBrief.objective,
    executionStrategy: heuristicBrief.planSummary,
    feasibility: heuristicBrief.executionMode === 'analysis_only' ? 'analysis_only' : 'partially_executable',
    requiredCapabilities: listMissionCapabilities(),
    blockingCapabilities: heuristicBrief.interpretationWarnings || ['No direct capability mapping was found for this task.'],
    steps: (heuristicBrief.planSteps || []).map((step, index) => ({
      id: `step_${index + 1}`,
      title: step,
      reasoning: heuristicBrief.planSummary,
      kind: 'analysis',
      approvalRequired: false,
      expectedOutput: null,
    })),
    actions: [],
    approvals: [],
    results: [],
  };
}

export class MissionPlanner {
  static async planMission(
    merchant: Merchant,
    prompt: string,
    explicitGoalType?: any
  ): Promise<MerchantMissionBrief> {
    if (!explicitGoalType) {
      const planned = await this.planOpenEndedMission(merchant, prompt);
      return planned.brief;
    }

    const heuristicBrief = buildMissionBriefFromPrompt(prompt, explicitGoalType);
    return heuristicBrief;
  }

  static async planOpenEndedMission(
    merchant: Merchant,
    prompt: string
  ): Promise<{ brief: MerchantMissionBrief; plan: MissionPlanDocument }> {
    const config = getMerchantAIConfig(merchant);
    const heuristicBrief = buildMissionBriefFromPrompt(prompt, inferMissionGoalTypeFromPrompt(prompt));
    const actionDefinitions = listMissionActionDefinitions();
    const capabilityStatuses = listMissionCapabilities();

    const systemPrompt = `You are Convos Mission Planner v2.
You plan open-ended merchant tasks using only the allowed action registry.
Stay faithful to the merchant wording. Do not substitute a different objective.
If a task cannot be completed with the available actions, mark feasibility as "analysis_only" or "partially_executable".
Only use action ids from the registry below.

Action registry:
${JSON.stringify(actionDefinitions, null, 2)}

Return strict JSON:
{
  "merchantFacingTitle": "Task-specific title",
  "interpretedObjective": "Normalized objective",
  "executionStrategy": "How the system will approach it",
  "feasibility": "executable | partially_executable | analysis_only",
  "requiredCapabilities": [{"capabilityId":"...","label":"...","status":"available | requires_approval | unsupported","reason":"optional"}],
  "blockingCapabilities": ["missing or unsupported capabilities"],
  "likelyOutputs": ["..."],
  "steps": [{"id":"step_1","title":"...","reasoning":"...","kind":"analysis | action","actionId":"action_optional","approvalRequired":true,"expectedOutput":"..."}],
  "actions": [{"id":"action_1","actionId":"registry_action_id","title":"...","reasoning":"...","input":{} }]
}`;

    try {
      const result = await callAI(config, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.trim() },
      ]);

      const message = getMessageFromResponse(config, result.response || result);
      const json = parseJsonObject(String(typeof message === 'string' ? message : message?.content || ''));
      if (json) {
        const actions = Array.isArray(json.actions) ? json.actions : [];
        const validatedActions = actions.map((action: any, index: number) => validateMissionActionInvocation({
          id: String(action?.id || `action_${index + 1}`),
          actionId: String(action?.actionId || ''),
          title: String(action?.title || action?.actionId || `Action ${index + 1}`),
          reasoning: typeof action?.reasoning === 'string' ? action.reasoning : null,
          readOnly: false,
          approvalRequired: false,
          riskLevel: action?.riskLevel,
          input: action?.input && typeof action.input === 'object' && !Array.isArray(action.input) ? action.input : {},
        }));

        const steps: MissionPlanStep[] = Array.isArray(json.steps)
          ? json.steps.map((step: any, index: number) => ({
            id: String(step?.id || `step_${index + 1}`),
            title: String(step?.title || `Step ${index + 1}`),
            reasoning: typeof step?.reasoning === 'string' ? step.reasoning : null,
            kind: step?.kind === 'action' ? 'action' : 'analysis',
            actionId: typeof step?.actionId === 'string' ? step.actionId : null,
            approvalRequired: Boolean(step?.approvalRequired),
            expectedOutput: typeof step?.expectedOutput === 'string' ? step.expectedOutput : null,
          }))
          : [];

        const feasibility = json.feasibility === 'executable' || json.feasibility === 'partially_executable' || json.feasibility === 'analysis_only'
          ? json.feasibility
          : validatedActions.length > 0 ? 'executable' : 'analysis_only';

        const plan: MissionPlanDocument = {
          planVersion: 2,
          requestedTask: prompt.trim(),
          interpretedObjective: String(json.interpretedObjective || heuristicBrief.objective),
          executionStrategy: String(json.executionStrategy || heuristicBrief.planSummary),
          feasibility,
          requiredCapabilities: Array.isArray(json.requiredCapabilities) && json.requiredCapabilities.length > 0
            ? json.requiredCapabilities.map((item: any) => ({
              capabilityId: String(item?.capabilityId || ''),
              label: String(item?.label || item?.capabilityId || 'Capability'),
              status: item?.status === 'unsupported'
                ? 'unsupported'
                : item?.status === 'requires_approval'
                  ? 'requires_approval'
                  : 'available',
              reason: typeof item?.reason === 'string' ? item.reason : null,
            }))
            : capabilityStatuses,
          blockingCapabilities: Array.isArray(json.blockingCapabilities)
            ? json.blockingCapabilities.map((value: any) => String(value))
            : [],
          steps,
          actions: validatedActions,
          approvals: [],
          results: [],
        };

        const brief: MerchantMissionBrief = {
          ...heuristicBrief,
          originalPrompt: prompt.trim(),
          requestedTask: prompt.trim(),
          objective: plan.interpretedObjective,
          interpretedObjective: plan.interpretedObjective,
          executionStrategy: plan.executionStrategy,
          feasibility: plan.feasibility,
          requiredCapabilities: plan.requiredCapabilities,
          blockingCapabilities: plan.blockingCapabilities,
          planVersion: 2,
          merchantFacingTitle: String(json.merchantFacingTitle || toTaskTitle(prompt)),
          planSummary: plan.executionStrategy,
          planSteps: plan.steps.map((step) => step.title),
          likelyOutputs: Array.isArray(json.likelyOutputs) ? json.likelyOutputs.map((value: any) => String(value)) : heuristicBrief.likelyOutputs,
          actionBatches: plan.actions.filter((action) => action.approvalRequired).map((action) => action.title),
          executionMode: plan.feasibility === 'analysis_only' ? 'analysis_only' : 'actionable',
          interpretationWarnings: plan.blockingCapabilities,
        };

        return { brief, plan };
      }
    } catch (error) {
      logger.error('Failed to create open-ended mission plan, falling back to heuristics:', error);
    }

    const fallbackPlan = fallbackOpenEndedPlan(prompt);
    const brief: MerchantMissionBrief = {
      ...heuristicBrief,
      originalPrompt: prompt.trim(),
      requestedTask: prompt.trim(),
      objective: fallbackPlan.interpretedObjective,
      interpretedObjective: fallbackPlan.interpretedObjective,
      executionStrategy: fallbackPlan.executionStrategy,
      feasibility: fallbackPlan.feasibility,
      requiredCapabilities: fallbackPlan.requiredCapabilities,
      blockingCapabilities: fallbackPlan.blockingCapabilities,
      planVersion: 2,
      merchantFacingTitle: toTaskTitle(prompt),
      planSummary: fallbackPlan.executionStrategy,
      planSteps: fallbackPlan.steps.map((step) => step.title),
      likelyOutputs: heuristicBrief.likelyOutputs,
      actionBatches: fallbackPlan.actions.filter((action) => action.approvalRequired).map((action) => action.title),
      executionMode: fallbackPlan.feasibility === 'analysis_only' ? 'analysis_only' : 'actionable',
      interpretationWarnings: fallbackPlan.blockingCapabilities,
    };

    return { brief, plan: fallbackPlan };
  }
}
