import { supabaseAdmin } from '@/lib/supabase-admin';
import { logDomainEvent } from '@/lib/agentic/events';
import { evaluateApprovalPolicy, type ApprovalPolicyDomain } from '@/lib/agentic/policies';
import { processMissionPlanById } from '@/lib/agentic/runtime/processor';
import { appendAssistantTaskUpdateByPlanId, syncAssistantTaskThreadStatusByPlanId } from '@/lib/merchant-assistant';
import logger from '@/lib/logger';
import type { ApprovedMissionBatch, MerchantApprovalItem, MissionPlanDocument } from '@/types';

function inferMissionApprovalDomain(intentType: string): MerchantApprovalItem['domain'] {
  if (intentType.includes('support')) return 'support';
  if (intentType.includes('cart') || intentType.includes('aov') || intentType.includes('campaign') || intentType.includes('winback')) return 'campaigns';
  if (intentType.includes('stock') || intentType.includes('catalog') || intentType.includes('inventory')) return 'catalog';
  if (intentType.includes('shipping') || intentType.includes('order')) return 'orders';
  return 'mission';
}

function normalizeMissionIntent(plan: any) {
  return Array.isArray(plan?.customer_intents) ? plan.customer_intents[0] : plan?.customer_intents;
}

function updateIntentWorkflowState(existingConstraints: any, workflowPatch: Record<string, unknown>) {
  const constraints = existingConstraints && typeof existingConstraints === 'object' && !Array.isArray(existingConstraints)
    ? existingConstraints
    : {};

  const currentWorkflow = constraints.workflow && typeof constraints.workflow === 'object' && !Array.isArray(constraints.workflow)
    ? constraints.workflow
    : {};

  return {
    ...constraints,
    workflow: {
      ...currentWorkflow,
      ...workflowPatch,
    },
  };
}

function updatePlannedChangeStatuses(existingConstraints: any, status: 'approved' | 'rejected') {
  const constraints = existingConstraints && typeof existingConstraints === 'object' && !Array.isArray(existingConstraints)
    ? existingConstraints
    : {};

  const workflow = constraints.workflow && typeof constraints.workflow === 'object' && !Array.isArray(constraints.workflow)
    ? constraints.workflow
    : {};

  const proposedChanges = Array.isArray(workflow.proposedChanges)
    ? workflow.proposedChanges.map((batch: any) => ({
        ...batch,
        status,
      }))
    : workflow.proposedChanges;

  return {
    ...constraints,
    workflow: {
      ...workflow,
      proposedChanges,
    },
  };
}

function getPlanDocument(existingConstraints: any): MissionPlanDocument | null {
  const constraints = existingConstraints && typeof existingConstraints === 'object' && !Array.isArray(existingConstraints)
    ? existingConstraints
    : {};
  const workflow = constraints.workflow && typeof constraints.workflow === 'object' && !Array.isArray(constraints.workflow)
    ? constraints.workflow
    : {};
  const planDocument = workflow.planDocument;

  if (!planDocument || typeof planDocument !== 'object' || Array.isArray(planDocument)) {
    return null;
  }

  return planDocument as MissionPlanDocument;
}

function updatePlanApprovalBatch(
  existingConstraints: any,
  pendingBatch: ApprovedMissionBatch | null,
  status: Extract<ApprovedMissionBatch['status'], 'approved' | 'rejected'>
) {
  const planDocument = getPlanDocument(existingConstraints);
  if (!planDocument || !pendingBatch) {
    return existingConstraints;
  }

  const now = new Date().toISOString();
  const approvals = planDocument.approvals || [];
  const nextBatch: ApprovedMissionBatch = status === 'approved'
    ? {
      ...pendingBatch,
      status: 'approved',
      approvedAt: now,
      rejectedAt: null,
      rejectionReason: null,
    }
    : {
      ...pendingBatch,
      status: 'rejected',
      approvedAt: pendingBatch.approvedAt || null,
      rejectedAt: now,
      rejectionReason: pendingBatch.rejectionReason || null,
    };

  const hasMatch = approvals.some((batch) => batch.id === pendingBatch.id);
  const nextApprovals = hasMatch
    ? approvals.map((batch) => (batch.id === pendingBatch.id ? nextBatch : batch))
    : [...approvals, nextBatch];

  return updateIntentWorkflowState(existingConstraints, {
    planDocument: {
      ...planDocument,
      approvals: nextApprovals,
    },
  });
}

async function getMissionPlanForMerchant(merchantId: string, planId: string) {
  const { data, error } = await supabaseAdmin
    .from('agent_plans')
    .select('id, intent_id, is_approved, status, customer_intents!inner(id, merchant_id, goal, consumer_email, intent_type, constraints)')
    .eq('id', planId)
    .eq('customer_intents.merchant_id', merchantId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function getDecisionApprovalDomain(decisionType: string): MerchantApprovalItem['domain'] {
  if (decisionType === 'refund_rejected' || decisionType === 'refund_approved') return 'refunds';
  if (decisionType === 'loyalty_reward') return 'loyalty';
  if (decisionType === 'discount_rejected' || decisionType === 'discount_approved') return 'pricing';
  if (decisionType === 'shipping_selected') return 'shipping';
  if (decisionType.includes('campaign')) return 'campaigns';
  if (decisionType.includes('support')) return 'support';
  return 'update';
}

function getDecisionApprovalRisk(decision: any) {
  const domain = getDecisionApprovalDomain(String(decision.decision_type || ''));
  if (domain === 'refunds') {
    return { amount: Number(decision.factors?.order_amount || 0) };
  }

  if (domain === 'pricing') {
    const originalPrice = Number(decision.factors?.original_price || 0);
    const requestedPrice = Number(decision.factors?.requested_price || decision.factors?.bargained_price || 0);
    const discountPercentage = originalPrice > 0 && requestedPrice > 0
      ? Math.round(((originalPrice - requestedPrice) / originalPrice) * 100)
      : Number(decision.factors?.discount_pct || 0);
    return { discountPercentage };
  }

  if (domain === 'campaigns') {
    return { outboundContacts: Number(decision.factors?.outboundContacts || 1) };
  }

  return {};
}

export function describeDecisionApprovalPolicy(merchant: Record<string, any>, decision: any) {
  const domain = getDecisionApprovalDomain(String(decision.decision_type || ''));
  return evaluateApprovalPolicy(merchant, domain as ApprovalPolicyDomain, getDecisionApprovalRisk(decision));
}

export async function listPendingDecisionApprovals(merchantId: string): Promise<MerchantApprovalItem[]> {
  const [{ data: pendingDecisions }, { data: merchant }] = await Promise.all([
    supabaseAdmin
    .from('ai_decision_log')
    .select('id, decision_type, summary, human_summary, consumer_email, created_at, outcome, factors')
    .eq('merchant_id', merchantId)
    .filter('outcome->>reason', 'eq', 'requires_approval')
    .is('override_status', null)
    .order('created_at', { ascending: false })
    .limit(25),
    supabaseAdmin
      .from('merchants')
      .select('id, ai_refund_policy, ai_loyalty_policy, ai_shipping_policy, ai_max_discount_percentage, ai_max_refund_amount')
      .eq('id', merchantId)
      .single(),
  ]);

  return (pendingDecisions || []).map((decision: any) => {
    const policy = describeDecisionApprovalPolicy(merchant || {}, decision);
    return {
      id: `decision:${decision.id}`,
      kind: 'decision',
      domain: getDecisionApprovalDomain(String(decision.decision_type || '')),
      approvalStatus: 'pending',
      title: String(decision.summary || decision.decision_type || 'Decision approval'),
      summary: String(decision.human_summary || decision.summary || 'AI action requires approval.'),
      createdAt: String(decision.created_at),
      consumerEmail: decision.consumer_email || null,
      policySummary: policy.summary,
      decisionLogId: decision.id,
      decisionType: decision.decision_type || null,
    } satisfies MerchantApprovalItem;
  });
}

export async function recordApprovalLifecycleEvent(input: {
  merchantId: string
  kind: 'mission' | 'decision'
  domain: MerchantApprovalItem['domain']
  action: 'approve' | 'reject' | 'reverse'
  title: string
  summary: string
  actor?: 'user'
  consumerEmail?: string | null
  reason?: string | null
  factors?: Record<string, unknown>
  outcome?: Record<string, unknown>
}) {
  await logDomainEvent({
    merchantId: input.merchantId,
    type: `approval_${input.action}`,
    title: input.title,
    summary: input.summary,
    actor: input.actor || 'user',
    consumerEmail: input.consumerEmail || null,
    factors: {
      approval_kind: input.kind,
      approval_domain: input.domain,
      approval_reason: input.reason || null,
      ...(input.factors || {}),
    },
    outcome: {
      action: input.action,
      ...(input.outcome || {}),
    },
  });
}

export async function applyMissionApprovalAction(input: {
  merchantId: string
  planId: string
  action: 'approve' | 'reject'
  reason?: string | null
}) {
  const getPendingApprovalKind = (plan: any): MerchantApprovalItem['approvalKind'] => {
    const intent = normalizeMissionIntent(plan);
    const constraints = intent?.constraints && typeof intent.constraints === 'object' && !Array.isArray(intent.constraints)
      ? intent.constraints
      : {};
    const workflow = constraints.workflow && typeof constraints.workflow === 'object' && !Array.isArray(constraints.workflow)
      ? constraints.workflow
      : {};

    return (workflow.pendingApprovalKind as MerchantApprovalItem['approvalKind']) || (plan?.is_approved === false ? 'plan' : null);
  };

  if (input.action === 'approve') {
    const plan = await getMissionPlanForMerchant(input.merchantId, input.planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const intent = normalizeMissionIntent(plan);
    const approvalKind = getPendingApprovalKind(plan);
    const intentConstraints = intent?.constraints && typeof intent.constraints === 'object' && !Array.isArray(intent.constraints)
      ? intent.constraints
      : {};
    const workflow = intentConstraints.workflow && typeof intentConstraints.workflow === 'object' && !Array.isArray(intentConstraints.workflow)
      ? intentConstraints.workflow
      : {};
    const pendingActionBatch = workflow.pendingActionBatch && typeof workflow.pendingActionBatch === 'object' && !Array.isArray(workflow.pendingActionBatch)
      ? workflow.pendingActionBatch as ApprovedMissionBatch
      : null;

    const { error } = await supabaseAdmin
      .from('agent_plans')
      .update({
        is_approved: true,
        status: 'queued',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.planId)
      .eq('intent_id', plan.intent_id);

    if (error) {
      throw error;
    }
    await supabaseAdmin
      .from('customer_intents')
      .update({
        constraints: updateIntentWorkflowState(
          approvalKind === 'write_batch' && pendingActionBatch
            ? updatePlanApprovalBatch(intent?.constraints, pendingActionBatch, 'approved')
            : updatePlannedChangeStatuses(intent?.constraints, 'approved'),
          {
          phase: 'queued',
          pendingApprovalKind: null,
          pendingBatchLabel: null,
          pendingBatchIndex: null,
          pendingActionBatch: null,
          lastApprovedBatchIndex: approvalKind === 'write_batch'
            ? workflow.pendingBatchIndex ?? null
            : null,
          latestApprovalStatus: 'approved',
          nextAction: approvalKind === 'write_batch'
            ? 'The action batch is approved and the mission is queued to continue execution.'
            : 'Mission is approved and queued to begin execution.',
          blockingReason: null,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.intent_id);

    const domain = inferMissionApprovalDomain(String(intent?.intent_type || ''));
    await recordApprovalLifecycleEvent({
      merchantId: input.merchantId,
      kind: 'mission',
      domain,
      action: 'approve',
      title: approvalKind === 'write_batch' ? 'Mission action batch approved' : 'Mission approved',
      summary: approvalKind === 'write_batch'
        ? 'Merchant approved the next store-changing action batch for an active mission.'
        : 'Merchant approved an autonomous mission plan.',
      consumerEmail: intent?.consumer_email || null,
      reason: input.reason || null,
      factors: {
        planId: input.planId,
        intentId: plan.intent_id,
        intentType: intent?.intent_type || null,
        approvalKind,
      },
      outcome: {
        planStatus: 'queued',
        approvalStatus: 'approved',
      },
    });

    await appendAssistantTaskUpdateByPlanId({
      planId: input.planId,
      content: approvalKind === 'write_batch'
        ? 'Approved. Continuing with the exact stored action batch.'
        : 'Approved. The task is queued to begin execution.',
      messageType: 'approval_result',
      status: 'approved',
    });
    await syncAssistantTaskThreadStatusByPlanId(input.planId);

    try {
      await processMissionPlanById(plan.id);
    } catch (runtimeError) {
      logger.error('Failed to immediately execute approved mission:', {
        merchantId: input.merchantId,
        planId: plan.id,
        intentId: plan.intent_id,
        error: runtimeError,
      });
    }

    return plan;
  }

  const plan = await getMissionPlanForMerchant(input.merchantId, input.planId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  const intent = normalizeMissionIntent(plan);
  const approvalKind = getPendingApprovalKind(plan);
  const intentConstraints = intent?.constraints && typeof intent.constraints === 'object' && !Array.isArray(intent.constraints)
    ? intent.constraints
    : {};
  const workflow = intentConstraints.workflow && typeof intentConstraints.workflow === 'object' && !Array.isArray(intentConstraints.workflow)
    ? intentConstraints.workflow
    : {};
  const pendingActionBatch = workflow.pendingActionBatch && typeof workflow.pendingActionBatch === 'object' && !Array.isArray(workflow.pendingActionBatch)
    ? workflow.pendingActionBatch as ApprovedMissionBatch
    : null;

  if (approvalKind === 'write_batch') {
    await supabaseAdmin
      .from('agent_plans')
      .update({
        status: 'blocked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.planId);

    await supabaseAdmin
      .from('customer_intents')
      .update({
        status: 'active',
        constraints: updateIntentWorkflowState(
          pendingActionBatch
            ? updatePlanApprovalBatch(intent?.constraints, {
              ...pendingActionBatch,
              rejectionReason: input.reason || 'Merchant rejected the proposed action batch.',
            }, 'rejected')
            : updatePlannedChangeStatuses(intent?.constraints, 'rejected'),
          {
          phase: 'blocked',
          pendingApprovalKind: null,
          pendingBatchLabel: null,
          pendingBatchIndex: null,
          pendingActionBatch: null,
          lastApprovedBatchIndex: null,
          latestApprovalStatus: 'rejected',
          nextAction: 'The write batch was rejected. Review the plan, adjust the mission, or rerun it when ready.',
          blockingReason: input.reason || 'Merchant rejected the proposed action batch.',
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.intent_id);

    const domain = inferMissionApprovalDomain(String(intent?.intent_type || ''));
    await recordApprovalLifecycleEvent({
      merchantId: input.merchantId,
      kind: 'mission',
      domain,
      action: 'reject',
      title: 'Mission action batch rejected',
      summary: 'Merchant rejected a store-changing action batch, leaving the mission blocked.',
      consumerEmail: intent?.consumer_email || null,
      reason: input.reason || null,
      factors: {
        planId: input.planId,
        intentId: plan.intent_id,
        intentType: intent?.intent_type || null,
        approvalKind,
      },
      outcome: {
        planStatus: 'blocked',
        approvalStatus: 'rejected',
      },
    });

    await appendAssistantTaskUpdateByPlanId({
      planId: input.planId,
      content: input.reason || 'Rejected. The action batch stays blocked until the request is adjusted.',
      messageType: 'approval_result',
      status: 'rejected',
    });
    await syncAssistantTaskThreadStatusByPlanId(input.planId);

    return plan;
  }

  await supabaseAdmin
    .from('agent_plans')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.planId);

  await supabaseAdmin
    .from('customer_intents')
    .update({
      status: 'cancelled',
      constraints: updateIntentWorkflowState(intent?.constraints, {
        phase: 'cancelled',
        pendingApprovalKind: null,
        pendingBatchLabel: null,
        pendingBatchIndex: null,
        lastApprovedBatchIndex: null,
        latestApprovalStatus: 'rejected',
        nextAction: 'Mission was rejected and will not execute.',
        blockingReason: input.reason || 'Merchant rejected the generated plan.',
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', plan.intent_id);

  const domain = inferMissionApprovalDomain(String(intent?.intent_type || ''));
  await recordApprovalLifecycleEvent({
    merchantId: input.merchantId,
    kind: 'mission',
    domain,
    action: 'reject',
    title: 'Mission rejected',
    summary: 'Merchant declined an autonomous mission plan.',
    consumerEmail: intent?.consumer_email || null,
    reason: input.reason || null,
    factors: {
      planId: input.planId,
      intentId: plan.intent_id,
      intentType: intent?.intent_type || null,
      approvalKind,
    },
    outcome: {
      planStatus: 'cancelled',
      approvalStatus: 'rejected',
    },
  });

  await appendAssistantTaskUpdateByPlanId({
    planId: input.planId,
    content: input.reason || 'Rejected. The mission will not execute.',
    messageType: 'approval_result',
    status: 'rejected',
  });
  await syncAssistantTaskThreadStatusByPlanId(input.planId);

  return plan;
}

export function buildMissionApprovalItem(plan: any): MerchantApprovalItem {
  const intent = normalizeMissionIntent(plan);
  const domain = inferMissionApprovalDomain(String(intent?.intent_type || ''));
  const constraints = intent?.constraints && typeof intent.constraints === 'object' && !Array.isArray(intent.constraints)
    ? intent.constraints
    : {};
  const brief = constraints.missionBrief && typeof constraints.missionBrief === 'object' && !Array.isArray(constraints.missionBrief)
    ? constraints.missionBrief
    : null;
  const workflow = constraints.workflow && typeof constraints.workflow === 'object' && !Array.isArray(constraints.workflow)
    ? constraints.workflow
    : {};
  const pendingActionBatch = workflow.pendingActionBatch && typeof workflow.pendingActionBatch === 'object' && !Array.isArray(workflow.pendingActionBatch)
    ? workflow.pendingActionBatch as ApprovedMissionBatch
    : null;

  return {
    id: `mission:${plan.id}`,
    kind: 'mission',
    domain,
    approvalStatus: 'pending',
    title: String(brief?.merchantFacingTitle || intent?.goal || 'Mission pending approval'),
    summary: String(
      workflow?.pendingApprovalKind === 'write_batch'
        ? pendingActionBatch?.preview?.summary
          || `Approve the next action batch: ${String(workflow?.pendingBatchLabel || plan.steps?.[plan.current_step || 0] || 'store update')}.`
        : brief?.planSummary
          || workflow?.nextAction
          || `Mission has ${Array.isArray(plan.steps) ? plan.steps.length : 0} planned steps and is waiting for approval.`
    ),
    createdAt: String(plan.created_at),
    consumerEmail: intent?.consumer_email || null,
    policySummary: workflow?.pendingApprovalKind === 'write_batch'
      ? String(pendingActionBatch?.preview?.riskSummary || 'Mission is paused before a store-changing action batch and needs merchant approval to continue.')
      : 'Mission plan requires merchant approval before autonomous execution.',
    missionId: intent?.id || null,
    planId: plan.id,
    approvalKind: (workflow?.pendingApprovalKind as MerchantApprovalItem['approvalKind']) || 'plan',
  } satisfies MerchantApprovalItem;
}
