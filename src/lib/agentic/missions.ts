import { supabaseAdmin } from '@/lib/supabase-admin';
import { logDomainEvent, listMerchantAgentEvents } from '@/lib/agentic/events';
import { MissionPlanner } from '@/lib/agentic/planner';
import { createMissionBlueprint, DEFAULT_AGENT_SUGGESTIONS, inferMissionGoalTypeFromPrompt } from '@/lib/agentic/mission-templates';
import { resolveMerchantPolicies } from '@/lib/agentic/policies';
import { buildMissionApprovalItem, listPendingDecisionApprovals } from '@/lib/agentic/approvals';
import { processMissionPlanById } from '@/lib/agentic/runtime/processor';
import logger from '@/lib/logger';
import type {
  ApprovedMissionBatch,
  AgenticGoalType,
  Merchant,
  MerchantApprovalItem,
  MerchantMissionBrief,
  MerchantMissionDetail,
  MerchantMissionPhase,
  MerchantMissionLogEntry,
  MerchantMissionPlannedChangeBatch,
  MerchantMissionSummary,
  MerchantMissionStep,
  MerchantMissionThreadItem,
  MissionActionPreview,
  MissionPlanDocument,
} from '@/types';

function normalizeMissionStatus(planStatus: string | null | undefined, intentStatus: string | null | undefined): MerchantMissionSummary['status'] {
  if (planStatus === 'failed_retryable') return 'failed_retryable';
  if (planStatus === 'failed') return 'failed';
  if (planStatus === 'completed' || intentStatus === 'completed') return 'completed';
  if (planStatus === 'cancelled' || intentStatus === 'cancelled') return 'cancelled';
  if (planStatus === 'blocked') return 'blocked';
  if (planStatus === 'planning') return 'planning';
  if (planStatus === 'queued') return 'queued';
  return 'in_progress';
}

function inferScope(goalType: string): MerchantMissionSummary['scope'] {
  if (goalType.includes('stock') || goalType.includes('catalog') || goalType.includes('inventory')) return 'catalog';
  if (goalType.includes('cart') || goalType.includes('aov') || goalType.includes('marketing')) return 'marketing';
  if (goalType.includes('customer') || goalType.includes('conversion')) return 'customers';
  if (goalType.includes('support')) return 'support';
  return 'operations';
}

function normalizeMissionConstraints(constraints: unknown): Record<string, unknown> | null {
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) {
    return null;
  }

  return constraints as Record<string, unknown>;
}

function extractMissionBrief(constraints: unknown): MerchantMissionBrief | null {
  const normalized = normalizeMissionConstraints(constraints);
  const brief = normalized?.missionBrief;

  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) {
    return null;
  }

  return brief as MerchantMissionBrief;
}

function getPlanVersion(constraints: unknown): 1 | 2 {
  const brief = extractMissionBrief(constraints);
  if (brief?.planVersion === 2) {
    return 2;
  }

  const workflow = getWorkflowState(constraints);
  return workflow.planVersion === 2 ? 2 : 1;
}

function extractPlanDocument(constraints: unknown): MissionPlanDocument | null {
  const workflow = getWorkflowState(constraints);
  const raw = workflow.planDocument;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  return raw as MissionPlanDocument;
}

function toLegacyPlannedChangeBatch(preview: MissionActionPreview, status: ApprovedMissionBatch['status']): MerchantMissionPlannedChangeBatch {
  return {
    label: preview.title,
    summary: preview.summary,
    status: status === 'executed' ? 'applied' : status === 'rejected' ? 'rejected' : status === 'approved' ? 'approved' : 'draft',
    items: (preview.after && preview.after.length > 0 ? preview.after : preview.before || []).map((row, index) => ({
      entityType: String(preview.resourceType || 'resource'),
      entityId: String(row.id || `${preview.actionInvocationId}:${index}`),
      label: String(row.name || row.code || row.id || preview.title),
      field: String(preview.operation || 'update'),
      currentValue: preview.before?.[index] ? JSON.stringify(preview.before[index], null, 2) : null,
      proposedValue: preview.after?.[index] ? JSON.stringify(preview.after[index], null, 2) : null,
      summary: preview.riskSummary || preview.summary,
    })),
  };
}

function getWorkflowState(constraints: unknown) {
  const normalized = normalizeMissionConstraints(constraints);
  const workflow = normalized?.workflow;

  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    return {};
  }

  return workflow as Record<string, unknown>;
}

function getPlannedChanges(constraints: unknown): MerchantMissionPlannedChangeBatch[] {
  const workflow = getWorkflowState(constraints);
  const planDocument = extractPlanDocument(constraints);
  if (planDocument?.approvals?.length) {
    return planDocument.approvals.map((batch) => toLegacyPlannedChangeBatch(batch.preview, batch.status));
  }

  const proposedChanges = workflow.proposedChanges;

  if (!Array.isArray(proposedChanges)) {
    return [];
  }

  return proposedChanges.filter((batch): batch is MerchantMissionPlannedChangeBatch => (
    Boolean(batch)
    && typeof batch === 'object'
    && !Array.isArray(batch)
    && typeof (batch as MerchantMissionPlannedChangeBatch).label === 'string'
    && Array.isArray((batch as MerchantMissionPlannedChangeBatch).items)
  ));
}

function mergeIntentWorkflowState(existingConstraints: unknown, workflowPatch: Record<string, unknown>) {
  const constraints = normalizeMissionConstraints(existingConstraints) || {};
  const workflow = getWorkflowState(existingConstraints);

  return {
    ...constraints,
    workflow: {
      ...workflow,
      ...workflowPatch,
    },
  };
}

function inferMissionPhase(plan: any, intent: any, constraints: unknown): MerchantMissionPhase {
  const workflow = getWorkflowState(constraints);
  const pendingApprovalKind = typeof workflow.pendingApprovalKind === 'string' ? workflow.pendingApprovalKind : null;
  const workflowPhase = typeof workflow.phase === 'string' ? workflow.phase : null;
  const status = normalizeMissionStatus(plan?.status, intent?.status);

  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  if (status === 'planning') return 'awaiting_plan_approval';
  if (status === 'queued') return 'queued';
  if (status === 'blocked' && pendingApprovalKind === 'write_batch') return 'awaiting_action_batch';
  if (status === 'blocked' && workflowPhase === 'paused') return 'paused';
  if (status === 'blocked' || status === 'failed' || status === 'failed_retryable') return 'blocked';
  if (status === 'in_progress') return 'executing';
  return 'briefing';
}

function buildMissionSummary(intent: any, plan: any): MerchantMissionSummary {
  const brief = extractMissionBrief(intent?.constraints);
  const workflow = getWorkflowState(intent?.constraints);
  const planVersion = getPlanVersion(intent?.constraints);
  const planDocument = extractPlanDocument(intent?.constraints);
  const pendingActionBatch = workflow.pendingActionBatch && typeof workflow.pendingActionBatch === 'object' && !Array.isArray(workflow.pendingActionBatch)
    ? workflow.pendingActionBatch as ApprovedMissionBatch
    : null;
  const scope = brief?.interpretedScope || inferScope(String(intent.intent_type || ''));
  const missionPhase = inferMissionPhase(plan, intent, intent?.constraints);
  const pendingApprovalKind = typeof workflow.pendingApprovalKind === 'string' ? workflow.pendingApprovalKind : null;
  const workflowApprovalStatus = typeof workflow.latestApprovalStatus === 'string'
    ? workflow.latestApprovalStatus
    : null;
  const approvalStatus = pendingApprovalKind
    ? 'pending'
    : workflowApprovalStatus === 'rejected'
      ? 'rejected'
      : workflowApprovalStatus === 'approved'
        ? 'approved'
        : plan?.is_approved === false
          ? 'pending'
          : plan?.is_approved === true
            ? 'approved'
            : 'not_required';

  return {
    id: intent.id,
    planId: plan?.id || null,
    title: brief?.merchantFacingTitle || String(intent.goal || 'Agent mission'),
    goal: brief?.objective || String(intent.goal || 'Agent mission'),
    consumerEmail: intent.consumer_email || null,
    missionType: brief?.interpretedType || String(intent.intent_type || 'support_triage'),
    status: normalizeMissionStatus(plan?.status, intent.status),
    approvalStatus,
    confidence: plan?.is_approved === false ? 0.74 : 0.9,
    scope,
    steps: planVersion === 2 && planDocument
      ? planDocument.steps.map((step) => step.title)
      : Array.isArray(plan?.steps) ? plan.steps : [],
    currentStep: typeof plan?.current_step === 'number' ? plan.current_step : 0,
    attemptCount: 0,
    nextRetryAt: null,
    lastError: null,
    progressLabel: missionPhase === 'awaiting_plan_approval'
      ? 'Waiting for plan approval'
      : missionPhase === 'awaiting_action_batch'
        ? 'Waiting for action batch approval'
        : missionPhase === 'paused'
          ? 'Paused by merchant'
        : plan?.status === 'completed'
          ? 'Completed'
          : plan?.status === 'planning'
            ? 'Waiting for approval'
            : 'Executing mission',
    createdAt: String(intent.created_at || plan?.created_at || new Date().toISOString()),
    updatedAt: String(plan?.updated_at || intent.updated_at || intent.created_at || new Date().toISOString()),
    roiSummary: typeof workflow.roiSummary === 'string'
      ? workflow.roiSummary
      : plan?.status === 'completed'
        ? 'Completed mission impact ready for review.'
        : null,
    blockingReason: typeof workflow.blockingReason === 'string'
      ? workflow.blockingReason
      : missionPhase === 'paused'
        ? 'Mission paused by merchant.'
      : plan?.status === 'blocked'
        ? 'Blocked by policy or external dependency.'
        : null,
    missionPhase,
    approvalKind: pendingApprovalKind === 'write_batch' ? 'write_batch' : plan?.is_approved === false ? 'plan' : null,
    nextAction: typeof workflow.nextAction === 'string'
      ? workflow.nextAction
      : missionPhase === 'awaiting_plan_approval'
        ? 'Review the generated mission plan and approve execution.'
        : missionPhase === 'awaiting_action_batch'
          ? 'Review the proposed write batch before execution continues.'
          : missionPhase === 'paused'
            ? 'Resume mission when you are ready to continue execution.'
          : missionPhase === 'executing'
            ? 'Monitor progress and review outcomes as the mission completes.'
            : missionPhase === 'completed'
              ? 'Review completed outputs and decide whether to launch another mission.'
              : null,
    resultSummary: typeof workflow.resultSummary === 'string' ? workflow.resultSummary : null,
    brief,
    planVersion,
    feasibility: brief?.feasibility || planDocument?.feasibility,
    approvalSummary: pendingActionBatch?.preview?.summary
      || (typeof workflow.pendingBatchLabel === 'string' ? workflow.pendingBatchLabel : null),
  } satisfies MerchantMissionSummary;
}

function buildMissionStepProgress(steps: string[], currentStep: number, status: MerchantMissionSummary['status'], logs: MerchantMissionLogEntry[]): MerchantMissionStep[] {
  return steps.map((step, index) => {
    const matchingLog = logs.find((entry) => entry.actionType === step);
    const isCompleted = status === 'completed' || index < currentStep;
    const isCurrent = !isCompleted && index === currentStep && status !== 'planning' && status !== 'queued' && status !== 'cancelled';
    const isBlocked = status === 'blocked' && index === currentStep;

    return {
      index,
      label: step,
      status: isCompleted ? 'completed' : isBlocked ? 'blocked' : isCurrent ? 'current' : 'pending',
      log: matchingLog?.description || null,
      loggedAt: matchingLog?.createdAt || null,
    } satisfies MerchantMissionStep;
  });
}

function buildMissionThreadItems(input: {
  summary: MerchantMissionSummary
  logs: MerchantMissionLogEntry[]
  plannedChanges: MerchantMissionPlannedChangeBatch[]
}) {
  const { summary, logs, plannedChanges } = input;
  const items: MerchantMissionThreadItem[] = [];

  items.push({
    id: `${summary.id}:request`,
    kind: 'merchant_request',
    title: 'Merchant request',
    body: summary.brief?.originalPrompt || summary.goal,
    createdAt: summary.createdAt,
    status: null,
    meta: {
      badge: summary.scope,
      stepLabel: null,
    },
    plannedBatch: null,
  });

  items.push({
    id: `${summary.id}:plan`,
    kind: 'agent_plan',
    title: 'Convos plan',
    body: summary.brief?.planSummary || summary.progressLabel,
    createdAt: summary.createdAt,
    status: summary.missionPhase || summary.status,
    meta: {
      badge: summary.brief?.interpretedType || summary.missionType,
      stepLabel: summary.steps[0] || null,
    },
    plannedBatch: null,
  });

  plannedChanges.forEach((batch, index) => {
    items.push({
      id: `${summary.id}:approval:${index}`,
      kind: 'approval_request',
      title: batch.label,
      body: batch.summary,
      createdAt: summary.updatedAt,
      status: batch.status || (summary.approvalStatus === 'pending' ? 'pending' : null),
      meta: {
        badge: summary.approvalKind === 'write_batch' ? 'write batch' : 'plan approval',
        stepLabel: summary.nextAction || null,
      },
      plannedBatch: batch,
    });
  });

  logs
    .slice()
    .reverse()
    .forEach((log) => {
      items.push({
        id: `${summary.id}:log:${log.id}`,
        kind: log.status === 'failed'
          ? 'blocker'
          : log.status === 'completed'
            ? 'result'
            : 'execution_update',
        title: formatThreadTitle(log.actionType),
        body: log.description,
        createdAt: log.createdAt,
        status: log.status,
        meta: {
          badge: formatThreadStatus(log.status),
          stepLabel: log.actionType,
        },
        plannedBatch: null,
      });
    });

  if (summary.resultSummary && !items.some((item) => item.kind === 'result' && item.body === summary.resultSummary)) {
    items.push({
      id: `${summary.id}:result`,
      kind: 'result',
      title: 'Mission result',
      body: summary.resultSummary,
      createdAt: summary.updatedAt,
      status: summary.status,
      meta: {
        badge: summary.status,
        stepLabel: null,
      },
      plannedBatch: null,
    });
  }

  if (summary.blockingReason && !items.some((item) => item.kind === 'blocker' && item.body === summary.blockingReason)) {
    items.push({
      id: `${summary.id}:blocker`,
      kind: 'blocker',
      title: 'Mission blocked',
      body: summary.blockingReason,
      createdAt: summary.updatedAt,
      status: summary.status,
      meta: {
        badge: 'blocked',
        stepLabel: summary.nextAction || null,
      },
      plannedBatch: null,
    });
  }

  return items.sort((a, b) => new Date(a.createdAt || summary.createdAt).getTime() - new Date(b.createdAt || summary.createdAt).getTime());
}

function formatThreadTitle(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatThreadStatus(value: string) {
  return value.replace(/_/g, ' ');
}

async function collapseDuplicateAutoTriggerMissions(merchantId: string, intentType: string, currentIntentId: string) {
  const { data: intents } = await supabaseAdmin
    .from('customer_intents')
    .select('id, created_at')
    .eq('merchant_id', merchantId)
    .eq('intent_type', intentType)
    .eq('status', 'active')
    .contains('constraints', { origin: 'auto_trigger_engine' })
    .order('created_at', { ascending: true });

  if (!intents || intents.length <= 1) {
    return { keepCurrent: true };
  }

  const keeper = intents[0];
  const duplicateIds = intents.slice(1).map((intent) => intent.id);

  if (duplicateIds.length > 0) {
    await supabaseAdmin
      .from('customer_intents')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .in('id', duplicateIds);

    const { data: duplicatePlans } = await supabaseAdmin
      .from('agent_plans')
      .select('id, intent_id')
      .in('intent_id', duplicateIds);

    const duplicatePlanIds = (duplicatePlans || []).map((plan) => plan.id);
    if (duplicatePlanIds.length > 0) {
      await supabaseAdmin
        .from('agent_plans')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .in('id', duplicatePlanIds);
    }
  }

  return { keepCurrent: keeper.id === currentIntentId, keeperId: keeper.id, duplicateIds };
}

function normalizeJoinedIntent(record: any) {
  if (!record?.customer_intents) {
    return null;
  }

  return Array.isArray(record.customer_intents) ? record.customer_intents[0] : record.customer_intents;
}

async function getLatestMerchantMissionPlan(merchantId: string, missionId: string) {
  const { data: plans, error } = await supabaseAdmin
    .from('agent_plans')
    .select('id, intent_id, status, is_approved, created_at, updated_at, customer_intents!inner(id, merchant_id, constraints, status)')
    .eq('intent_id', missionId)
    .eq('customer_intents.merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const plan = plans?.[0] || null;
  if (!plan) {
    return null;
  }

  return {
    ...plan,
    customer_intents: normalizeJoinedIntent(plan),
  };
}

export async function listMerchantMissions(
  merchantId: string,
  options?: { limit?: number; scope?: MerchantMissionSummary['scope'] }
): Promise<MerchantMissionSummary[]> {
  const limit = options?.limit ?? 20;
  const { data: intents } = await supabaseAdmin
    .from('customer_intents')
    .select('id, consumer_email, intent_type, goal, status, created_at, updated_at, constraints')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const intentIds = (intents || []).map((intent) => intent.id).filter(Boolean);
  const { data: plans } = intentIds.length > 0
    ? await supabaseAdmin
      .from('agent_plans')
      .select('id, intent_id, steps, current_step, status, is_approved, updated_at, created_at')
      .in('intent_id', intentIds)
      .order('created_at', { ascending: false })
    : { data: [] as any[] };

  const latestPlanByIntent = new Map<string, any>();
  for (const plan of plans || []) {
    if (!plan.intent_id || latestPlanByIntent.has(plan.intent_id)) {
      continue;
    }
    latestPlanByIntent.set(plan.intent_id, plan);
  }

  return (intents || [])
    .map((intent) => {
      const plan = latestPlanByIntent.get(intent.id);
      return buildMissionSummary(intent, plan);
    })
    .filter((mission) => !options?.scope || mission.scope === options.scope);
}

export async function getMerchantMissionDetail(merchantId: string, missionId: string): Promise<MerchantMissionDetail | null> {
  const [{ data: intent }, { data: plans }] = await Promise.all([
    supabaseAdmin
      .from('customer_intents')
      .select('id, consumer_email, intent_type, goal, status, created_at, updated_at, constraints')
      .eq('merchant_id', merchantId)
      .eq('id', missionId)
      .maybeSingle(),
    supabaseAdmin
    .from('agent_plans')
      .select('id, intent_id, steps, current_step, status, is_approved, updated_at, created_at')
      .eq('intent_id', missionId)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  if (!intent) {
    return null;
  }

  const plan = plans?.[0] || null;
  const { data: rawLogs, error: logsError } = plan?.id
    ? await supabaseAdmin
      .from('agent_action_logs')
      .select('id, action_type, description, status, created_at')
      .eq('plan_id', plan.id)
      .order('created_at', { ascending: false })
    : { data: [] as any[], error: null };

  if (logsError && !String(logsError.message || '').includes('agent_action_logs')) {
    throw logsError;
  }

  const logs: MerchantMissionLogEntry[] = (rawLogs || []).map((entry: any) => ({
    id: String(entry.id),
    actionType: String(entry.action_type || 'mission_update'),
    description: String(entry.description || 'Mission updated'),
    status: String(entry.status || 'success'),
    createdAt: String(entry.created_at || new Date().toISOString()),
  }));

  const summary = buildMissionSummary(intent, plan);
  const totalSteps = summary.steps.length;
  const currentStep = typeof summary.currentStep === 'number' ? summary.currentStep : 0;
  const completedSteps = summary.status === 'completed'
    ? totalSteps
    : Math.max(0, Math.min(currentStep, totalSteps));
  const plannedChanges = getPlannedChanges(intent.constraints);
  const planDocument = extractPlanDocument(intent.constraints);

  return {
    ...summary,
    currentStep,
    completionRatio: totalSteps === 0 ? 0 : completedSteps / totalSteps,
    logs,
    stepProgress: buildMissionStepProgress(summary.steps, currentStep, summary.status, logs),
    constraints: normalizeMissionConstraints(intent.constraints),
    plannedChanges,
    planDocument,
    threadItems: buildMissionThreadItems({
      summary,
      logs,
      plannedChanges,
    }),
    affectedEntities: Object.entries(
      normalizeMissionConstraints(intent.constraints) || {}
    )
      .filter(([key]) => key.endsWith('_id'))
      .map(([key, value]) => ({
        type: key.replace(/_id$/, ''),
        id: String(value),
        label: null,
      })),
  } satisfies MerchantMissionDetail;
}

export async function pauseMissionPlan(merchantId: string, missionId: string) {
  const plan = await getLatestMerchantMissionPlan(merchantId, missionId);
  if (!plan) {
    throw new Error('Mission not found or you do not have permission');
  }

  if (!['in_progress', 'queued'].includes(String(plan.status || ''))) {
    throw new Error('Only running or queued missions can be paused');
  }

  const intent = normalizeJoinedIntent(plan);
  await supabaseAdmin
    .from('agent_plans')
    .update({
      status: 'blocked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', plan.id);

  await supabaseAdmin
    .from('customer_intents')
    .update({
      constraints: mergeIntentWorkflowState(intent?.constraints, {
        phase: 'paused',
        pendingApprovalKind: null,
        pendingBatchLabel: null,
        pendingBatchIndex: null,
        nextAction: 'Resume mission when you are ready to continue execution.',
        blockingReason: 'Mission paused by merchant.',
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId)
    .eq('id', missionId);

  await logDomainEvent({
    merchantId,
    type: 'mission_paused',
    title: 'Mission paused',
    summary: 'Merchant paused an active mission.',
    actor: 'user',
    factors: { missionId, planId: plan.id },
  });
}

export async function resumeMissionPlan(merchantId: string, missionId: string) {
  const plan = await getLatestMerchantMissionPlan(merchantId, missionId);
  if (!plan) {
    throw new Error('Mission not found or you do not have permission');
  }

  if (!['blocked', 'queued', 'failed_retryable', 'failed'].includes(String(plan.status || ''))) {
    throw new Error('Only blocked or failed missions can be resumed');
  }

  const intent = normalizeJoinedIntent(plan);
  await supabaseAdmin
    .from('agent_plans')
    .update({
      status: 'queued',
      updated_at: new Date().toISOString(),
    })
    .eq('id', plan.id);

  if (intent) {
    await supabaseAdmin
      .from('customer_intents')
      .update({
        constraints: mergeIntentWorkflowState(intent.constraints, {
          phase: 'queued',
          pendingApprovalKind: null,
          pendingBatchLabel: null,
          pendingBatchIndex: null,
          latestApprovalStatus: plan.is_approved === false ? 'pending' : 'approved',
          nextAction: 'Mission is queued again and ready to continue execution.',
          blockingReason: null,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_id', merchantId)
      .eq('id', missionId);
  }

  await logDomainEvent({
    merchantId,
    type: 'mission_resumed',
    title: 'Mission resumed',
    summary: 'Merchant resumed a mission.',
    actor: 'user',
    factors: { missionId, planId: plan.id },
  });

  try {
    await processMissionPlanById(plan.id);
  } catch (error) {
    logger.error('Failed to immediately resume mission execution:', { missionId, planId: plan.id, error });
  }
}

export async function cancelMission(merchantId: string, missionId: string) {
  const plan = await getLatestMerchantMissionPlan(merchantId, missionId);
  if (!plan) {
    throw new Error('Mission not found or you do not have permission');
  }

  await supabaseAdmin
    .from('agent_plans')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', plan.id);

  const intent = normalizeJoinedIntent(plan);
  await supabaseAdmin
    .from('customer_intents')
    .update({
      status: 'cancelled',
      constraints: mergeIntentWorkflowState(intent?.constraints, {
        phase: 'cancelled',
        pendingApprovalKind: null,
        pendingBatchLabel: null,
        pendingBatchIndex: null,
        nextAction: 'Mission was cancelled and will not continue.',
        blockingReason: 'Mission cancelled by merchant.',
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId)
    .eq('id', missionId);

  await logDomainEvent({
    merchantId,
    type: 'mission_cancelled',
    title: 'Mission cancelled',
    summary: 'Merchant cancelled a mission.',
    actor: 'user',
    factors: { missionId, planId: plan.id },
  });
}

export async function deleteMission(merchantId: string, missionId: string) {
  // We need to verify ownership before deleting
  const { data: intent, error: fetchError } = await supabaseAdmin
    .from('customer_intents')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('id', missionId)
    .maybeSingle();

  if (fetchError || !intent) {
    throw fetchError || new Error('Mission not found or you do not have permission');
  }

  // Find associated plans to clean up logs
  const { data: plans } = await supabaseAdmin
    .from('agent_plans')
    .select('id')
    .eq('intent_id', missionId);

  const planIds = (plans || []).map(p => p.id);

  if (planIds.length > 0) {
    await supabaseAdmin
      .from('agent_action_logs')
      .delete()
      .in('plan_id', planIds);

    await supabaseAdmin
      .from('agent_plans')
      .delete()
      .in('id', planIds);
  }

  // Delete the intent itself
  const { error: deleteError } = await supabaseAdmin
    .from('customer_intents')
    .delete()
    .eq('id', missionId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function rerunMission(merchantId: string, missionId: string) {
  const plan = await getLatestMerchantMissionPlan(merchantId, missionId);
  if (!plan) {
    throw new Error('Mission not found or you do not have permission');
  }

  const intent = normalizeJoinedIntent(plan);
  const workflow = getWorkflowState(intent?.constraints);
  const proposedChanges = Array.isArray(workflow.proposedChanges)
    ? workflow.proposedChanges.map((batch: any) => ({
        ...batch,
        status: 'draft',
      }))
    : [];
  const nextPlanStatus = plan.is_approved === false ? 'planning' : 'queued';

  await supabaseAdmin
    .from('agent_plans')
    .update({
      current_step: 0,
      status: nextPlanStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', plan.id);

  await supabaseAdmin
    .from('customer_intents')
    .update({
      status: 'active',
      constraints: mergeIntentWorkflowState(intent?.constraints, {
        phase: plan.is_approved === false ? 'awaiting_plan_approval' : 'queued',
        pendingApprovalKind: plan.is_approved === false ? 'plan' : null,
        pendingBatchLabel: null,
        pendingBatchIndex: null,
        lastApprovedBatchIndex: null,
        latestApprovalStatus: plan.is_approved === false ? 'pending' : 'approved',
        nextAction: plan.is_approved === false
          ? 'Review the generated mission brief and approve the plan before any store changes happen.'
          : 'Mission was rerun from the beginning and is queued to execute.',
        blockingReason: null,
        resultSummary: null,
        proposedChanges,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId)
    .eq('id', missionId);

  await logDomainEvent({
    merchantId,
    type: 'mission_rerun',
    title: 'Mission rerun queued',
    summary: 'Merchant re-queued a mission from the beginning.',
    actor: 'user',
    factors: { missionId, planId: plan.id },
  });

  if (nextPlanStatus === 'queued') {
    try {
      await processMissionPlanById(plan.id);
    } catch (error) {
      logger.error('Failed to immediately rerun mission execution:', { missionId, planId: plan.id, error });
    }
  }
}

export async function createMerchantMissionFromGoal(
  merchant: Merchant,
  goalType: AgenticGoalType,
  customGoal?: string,
  options?: {
    origin?: 'merchant_command_surface' | 'auto_trigger_engine' | 'storefront_agent'
    actor?: 'agent' | 'system'
    consumerEmail?: string | null
    extraConstraints?: Record<string, unknown>
    forceApproval?: boolean
  }
) {
  const prompt = (customGoal || createMissionBlueprint(goalType).goal).trim();
  const brief = await MissionPlanner.planMission(merchant, prompt, goalType);
  const blueprint = createMissionBlueprint(brief.interpretedType, brief.objective);
  const policies = resolveMerchantPolicies(merchant);
  const operatorEmail = options?.consumerEmail || merchant.store_email || merchant.email || `${merchant.subdomain}@merchant.local`;
  const requiresInitialPlanApproval = options?.origin === 'merchant_command_surface' || Boolean(options?.forceApproval);
  const autoApprove = requiresInitialPlanApproval ? false : (options?.forceApproval ? false : blueprint.requiresApproval ? false : (
    blueprint.scope === 'catalog' ? policies.canAutoAdjustCatalog : true
  ));
  const origin = options?.origin || 'merchant_command_surface';
  const actor = options?.actor || 'agent';
  const originSummary = origin === 'auto_trigger_engine'
    ? `${brief.merchantFacingTitle} mission started automatically after store signals crossed the configured threshold.`
    : origin === 'storefront_agent'
      ? `${brief.merchantFacingTitle} mission was created from a storefront customer request.`
      : `${brief.merchantFacingTitle} mission started from the merchant command surface.`;
  const missionTitle = brief.merchantFacingTitle || blueprint.title;
  const missionGoal = brief.objective || blueprint.goal;
  const missionScope = brief.interpretedScope || blueprint.scope;
  const missionType = brief.interpretedType || blueprint.intentType;
  const missionSteps = brief.planSteps?.length ? brief.planSteps : blueprint.steps;

  const { data: intent, error: intentError } = await supabaseAdmin
    .from('customer_intents')
    .insert({
      merchant_id: merchant.id,
      consumer_email: operatorEmail,
      intent_type: missionType,
      goal: missionGoal,
      constraints: {
        origin,
        scope: missionScope,
        missionBrief: brief,
        workflow: {
          phase: autoApprove ? 'queued' : 'awaiting_plan_approval',
          pendingApprovalKind: autoApprove ? null : 'plan',
          pendingBatchLabel: null,
          pendingBatchIndex: null,
          lastApprovedBatchIndex: null,
          latestApprovalStatus: autoApprove ? 'approved' : 'pending',
          nextAction: autoApprove
            ? 'Mission is approved and queued to begin execution.'
            : 'Review the generated mission brief and approve the plan before any store changes happen.',
          resultSummary: null,
          roiSummary: blueprint.roiSummary,
          blockingReason: null,
        },
        ...(options?.extraConstraints || {}),
      },
      suggested_by_ai: true,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .select('id, consumer_email, intent_type, goal, status, created_at, updated_at')
    .single();

  if (intentError || !intent) {
    throw intentError || new Error('Failed to create mission intent');
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from('agent_plans')
    .insert({
      intent_id: intent.id,
      steps: missionSteps,
      status: autoApprove ? 'in_progress' : 'planning',
      is_approved: autoApprove,
      updated_at: new Date().toISOString(),
    })
    .select('id, status, is_approved, steps, updated_at, created_at')
    .single();

  if (planError || !plan) {
    throw planError || new Error('Failed to create mission plan');
  }

  if (origin === 'auto_trigger_engine') {
    const duplicateResolution = await collapseDuplicateAutoTriggerMissions(
      merchant.id,
      blueprint.intentType,
      intent.id
    );

    if (!duplicateResolution.keepCurrent) {
      return {
        mission: {
          id: intent.id,
          planId: plan.id,
          title: missionTitle,
          goal: missionGoal,
          consumerEmail: operatorEmail,
          missionType: missionType,
          status: 'cancelled',
          approvalStatus: autoApprove ? 'approved' : 'pending',
          confidence: autoApprove ? 0.9 : 0.74,
          scope: missionScope,
          steps: missionSteps,
          progressLabel: 'Cancelled as duplicate auto-trigger',
          createdAt: String(intent.created_at),
          updatedAt: String(plan.updated_at || intent.updated_at),
          roiSummary: blueprint.roiSummary,
          blockingReason: 'Duplicate auto-trigger mission collapsed behind an existing active mission.',
        } satisfies MerchantMissionSummary,
      };
    }
  }

  await logDomainEvent({
    merchantId: merchant.id,
    type: 'mission_created',
    title: missionTitle,
    summary: autoApprove
      ? originSummary
      : `${missionTitle} mission was created from a natural-language merchant objective and is waiting for plan approval.`,
    actor,
    consumerEmail: operatorEmail,
    factors: {
      missionType,
      planId: plan.id,
      scope: missionScope,
      origin,
    },
    outcome: {
      approvalStatus: autoApprove ? 'approved' : 'pending',
      roiSummary: blueprint.roiSummary,
    },
  });

  if (autoApprove) {
    try {
      await processMissionPlanById(plan.id);
    } catch (error) {
      logger.error('Failed to immediately execute mission after creation:', {
        merchantId: merchant.id,
        planId: plan.id,
        missionType: blueprint.intentType,
        error,
      });
    }
  }

  return {
    mission: {
      id: intent.id,
      planId: plan.id,
      title: missionTitle,
      goal: missionGoal,
      consumerEmail: operatorEmail,
      missionType,
      status: normalizeMissionStatus(plan.status, intent.status),
      approvalStatus: autoApprove ? 'approved' : 'pending',
      confidence: autoApprove ? 0.9 : 0.74,
      scope: missionScope,
      steps: missionSteps,
      progressLabel: autoApprove ? blueprint.progressLabel : 'Waiting for plan approval',
      createdAt: String(intent.created_at),
      updatedAt: String(plan.updated_at || intent.updated_at),
      roiSummary: blueprint.roiSummary,
      blockingReason: null,
      missionPhase: autoApprove ? 'queued' : 'awaiting_plan_approval',
      approvalKind: autoApprove ? null : 'plan',
      nextAction: autoApprove
        ? 'Mission is approved and queued to begin execution.'
        : 'Review the generated mission brief and approve the plan before any store changes happen.',
      resultSummary: null,
      brief,
    } satisfies MerchantMissionSummary,
  };
}

export async function createMerchantMissionFromPrompt(
  merchant: Merchant,
  prompt: string,
  options?: Parameters<typeof createMerchantMissionFromGoal>[3]
) {
  const { brief, plan } = await MissionPlanner.planOpenEndedMission(merchant, prompt);
  const operatorEmail = options?.consumerEmail || merchant.store_email || merchant.email || `${merchant.subdomain}@merchant.local`;
  const origin = options?.origin || 'merchant_command_surface';
  const actor = options?.actor || 'agent';

  const { data: intent, error: intentError } = await supabaseAdmin
    .from('customer_intents')
    .insert({
      merchant_id: merchant.id,
      consumer_email: operatorEmail,
      intent_type: brief.interpretedType || inferMissionGoalTypeFromPrompt(prompt),
      goal: brief.interpretedObjective || brief.objective || prompt.trim(),
      constraints: {
        origin,
        scope: brief.interpretedScope,
        missionBrief: brief,
        workflow: {
          planVersion: 2,
          phase: 'awaiting_plan_approval',
          pendingApprovalKind: 'plan',
          pendingBatchLabel: null,
          pendingBatchIndex: null,
          lastApprovedBatchIndex: null,
          latestApprovalStatus: 'pending',
          nextAction: plan.feasibility === 'analysis_only'
            ? 'Review the generated mission analysis and blocked capabilities before any execution.'
            : 'Review the generated mission plan and approve execution.',
          resultSummary: null,
          roiSummary: null,
          blockingReason: plan.feasibility === 'analysis_only' && plan.blockingCapabilities.length > 0
            ? plan.blockingCapabilities.join(' ')
            : null,
          planDocument: plan,
          executionLease: {
            status: 'idle',
            leaseId: null,
            leasedAt: null,
          },
        },
        ...(options?.extraConstraints || {}),
      },
      suggested_by_ai: true,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .select('id, consumer_email, intent_type, goal, status, created_at, updated_at')
    .single();

  if (intentError || !intent) {
    throw intentError || new Error('Failed to create mission intent');
  }

  const { data: planRow, error: planError } = await supabaseAdmin
    .from('agent_plans')
    .insert({
      intent_id: intent.id,
      steps: plan.steps.map((step) => step.title),
      status: 'planning',
      is_approved: false,
      updated_at: new Date().toISOString(),
    })
    .select('id, status, is_approved, steps, updated_at, created_at')
    .single();

  if (planError || !planRow) {
    throw planError || new Error('Failed to create mission plan');
  }

  await logDomainEvent({
    merchantId: merchant.id,
    type: 'mission_created',
    title: brief.merchantFacingTitle,
    summary: `${brief.merchantFacingTitle} mission was created from a natural-language merchant objective and is waiting for plan approval.`,
    actor,
    consumerEmail: operatorEmail,
    factors: {
      missionType: brief.interpretedType,
      planId: planRow.id,
      scope: brief.interpretedScope,
      origin,
      planVersion: 2,
      feasibility: plan.feasibility,
    },
    outcome: {
      approvalStatus: 'pending',
      feasibility: plan.feasibility,
    },
  });

  return {
    mission: {
      id: intent.id,
      planId: planRow.id,
      title: brief.merchantFacingTitle,
      goal: brief.interpretedObjective || brief.objective,
      consumerEmail: operatorEmail,
      missionType: brief.interpretedType,
      status: normalizeMissionStatus(planRow.status, intent.status),
      approvalStatus: 'pending',
      confidence: brief.interpretationConfidence || 0.9,
      scope: brief.interpretedScope,
      steps: plan.steps.map((step) => step.title),
      progressLabel: 'Waiting for plan approval',
      createdAt: String(intent.created_at),
      updatedAt: String(planRow.updated_at || intent.updated_at),
      roiSummary: null,
      blockingReason: plan.feasibility === 'analysis_only' && plan.blockingCapabilities.length > 0
        ? plan.blockingCapabilities.join(' ')
        : null,
      missionPhase: 'awaiting_plan_approval',
      approvalKind: 'plan',
      nextAction: plan.feasibility === 'analysis_only'
        ? 'Review the generated mission analysis and blocked capabilities before any execution.'
        : 'Review the generated mission plan and approve execution.',
      resultSummary: null,
      brief,
      planVersion: 2,
      feasibility: plan.feasibility,
    } satisfies MerchantMissionSummary,
  };
}

export async function listMerchantApprovals(merchantId: string): Promise<MerchantApprovalItem[]> {
  const [pendingPlansResult, decisionItems] = await Promise.all([
    supabaseAdmin
      .from('agent_plans')
      .select('id, intent_id, steps, current_step, status, is_approved, created_at, customer_intents!inner(id, merchant_id, goal, consumer_email, intent_type, constraints)')
      .eq('customer_intents.merchant_id', merchantId)
      .in('status', ['planning', 'blocked']),
    listPendingDecisionApprovals(merchantId),
  ]);

  const pendingPlans = (pendingPlansResult.data || []).filter((plan: any) => {
    const intent = Array.isArray(plan?.customer_intents) ? plan.customer_intents[0] : plan?.customer_intents;
    const workflow = getWorkflowState(intent?.constraints);

    if (plan.status === 'planning' && plan.is_approved === false) {
      return true;
    }

    return plan.status === 'blocked' && workflow.pendingApprovalKind === 'write_batch';
  });
  const missionItems = pendingPlans.map((plan: any) => buildMissionApprovalItem(plan));

  return [...missionItems, ...decisionItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getMissionControlSnapshot(merchant: Merchant) {
  const [missions, approvals, events] = await Promise.all([
    listMerchantMissions(merchant.id, { limit: 8 }),
    listMerchantApprovals(merchant.id),
    listMerchantAgentEvents(merchant.id, 8),
  ]);

  return {
    suggestions: DEFAULT_AGENT_SUGGESTIONS,
    missions,
    approvals,
    events,
  };
}
