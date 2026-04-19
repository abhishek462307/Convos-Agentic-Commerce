import logger from '@/lib/logger';
import { executeMissionAction, previewMissionAction } from '@/lib/agentic/runtime/action-registry';
import { appendAssistantTaskUpdateByPlanId, syncAssistantTaskThreadStatusByPlanId } from '@/lib/merchant-assistant';
import type { MissionProcessorResult, MissionRuntimeContext, MissionStepResult } from '@/lib/agentic/runtime/types';
import {
  fetchMissionPlan,
  logMissionAction,
  RETRYABLE_STATUSES,
  tryUpdatePlanState,
  updateIntentState,
  updatePlanState,
} from '@/lib/agentic/runtime/utils';
import { runSignalMissionStep } from '@/lib/agentic/runtime/executors/signal';
import { runCatalogMissionStep } from '@/lib/agentic/runtime/executors/catalog';
import { runRevenueMissionStep } from '@/lib/agentic/runtime/executors/revenue';
import { runNotificationMissionStep } from '@/lib/agentic/runtime/executors/notification';
import { runSupportMissionStep } from '@/lib/agentic/runtime/executors/support';
import type { ApprovedMissionBatch, MissionActionInvocation, MissionPlanDocument, MissionPlanStep } from '@/types';

function normalizeIntentConstraints(constraints: unknown) {
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) {
    return {};
  }

  return constraints as Record<string, unknown>;
}

function getIntentWorkflow(constraints: unknown) {
  const normalized = normalizeIntentConstraints(constraints);
  const workflow = normalized.workflow;

  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    return {};
  }

  return workflow as Record<string, unknown>;
}

function mergeIntentWorkflow(constraints: unknown, patch: Record<string, unknown>) {
  const normalized = normalizeIntentConstraints(constraints);
  const workflow = getIntentWorkflow(constraints);

  return {
    ...normalized,
    workflow: {
      ...workflow,
      ...patch,
    },
  };
}

function getPlanDocument(constraints: unknown): MissionPlanDocument | null {
  const workflow = getIntentWorkflow(constraints);
  const planDocument = workflow.planDocument;

  if (!planDocument || typeof planDocument !== 'object' || Array.isArray(planDocument)) {
    return null;
  }

  return planDocument as MissionPlanDocument;
}

function updatePlanDocument(constraints: unknown, planDocument: MissionPlanDocument, workflowPatch: Record<string, unknown> = {}) {
  return mergeIntentWorkflow(constraints, {
    ...workflowPatch,
    planDocument,
  });
}

function findPlanAction(planDocument: MissionPlanDocument, step: MissionPlanStep): MissionActionInvocation | null {
  if (!step.actionId) {
    return null;
  }

  return planDocument.actions.find((action) => action.id === step.actionId || action.actionId === step.actionId) || null;
}

function findApprovalBatch(planDocument: MissionPlanDocument, stepId: string) {
  return planDocument.approvals.find((batch) => batch.stepId === stepId) || null;
}

function upsertApprovalBatch(planDocument: MissionPlanDocument, nextBatch: ApprovedMissionBatch): MissionPlanDocument {
  const existing = planDocument.approvals || [];
  const found = existing.some((batch) => batch.id === nextBatch.id);

  return {
    ...planDocument,
    approvals: found
      ? existing.map((batch) => (batch.id === nextBatch.id ? nextBatch : batch))
      : [...existing, nextBatch],
  };
}

function appendPlanResult(
  planDocument: MissionPlanDocument,
  stepId: string,
  summary: string,
  actionInvocationId?: string | null
): MissionPlanDocument {
  return {
    ...planDocument,
    results: [
      ...(planDocument.results || []).filter((result) => result.stepId !== stepId),
      {
        stepId,
        actionInvocationId: actionInvocationId || null,
        summary,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function shouldPauseForWriteBatch(stepText: string) {
  return /(apply|launch|send|publish|sync|discount|message|email|notify|tag|archive|restock|assign|reprice|queue|commit|push|execute|finalize|activate|launch)/i.test(stepText);
}
function getMissionBrief(constraints: unknown) {
  const normalized = normalizeIntentConstraints(constraints);
  const missionBrief = normalized.missionBrief;

  if (!missionBrief || typeof missionBrief !== 'object' || Array.isArray(missionBrief)) {
    return null;
  }

  return missionBrief as {
    originalPrompt?: string
    objective?: string
    executionMode?: 'actionable' | 'analysis_only'
    interpretationWarnings?: string[]
  };
}

function buildAnalysisOnlyResult(context: MissionRuntimeContext): MissionStepResult {
  const brief = getMissionBrief(context.intent.constraints);
  const warningText = Array.isArray(brief?.interpretationWarnings) && brief?.interpretationWarnings.length > 0
    ? ` ${brief.interpretationWarnings.join(' ')}`
    : '';

  return {
    actionTaken: false,
    terminalStatus: 'blocked',
    intentStatus: 'active',
    logMessage: `Mission paused for clarification before execution. The request "${brief?.objective || context.intent.goal || 'this mission'}" is not specific enough for safe autonomous action.${warningText}`,
  };
}

async function pauseForWriteBatchApproval(context: MissionRuntimeContext): Promise<MissionProcessorResult | null> {
  const { plan, intent, steps, currentStepIdx } = context;
  const currentStepLabel = String(steps[currentStepIdx] || 'store update');
  const workflow = getIntentWorkflow(intent.constraints);

  if (
    workflow.pendingApprovalKind === 'write_batch'
    || workflow.lastApprovedBatchIndex === currentStepIdx
    || !shouldPauseForWriteBatch(currentStepLabel)
  ) {
    return null;
  }

  const constraints = normalizeIntentConstraints(intent.constraints);
  await updatePlanState(plan.id, {
    status: 'blocked',
  });
  await updateIntentState(intent.id, {
    constraints: {
      ...constraints,
      workflow: {
        ...workflow,
        phase: 'awaiting_action_batch',
        pendingApprovalKind: 'write_batch',
        pendingBatchLabel: currentStepLabel,
        pendingBatchIndex: currentStepIdx,
        latestApprovalStatus: 'pending',
        nextAction: `Approve the "${currentStepLabel}" action batch to continue execution.`,
        blockingReason: 'Mission paused before a store-changing action batch.',
      },
    },
  });
  await logMissionAction(plan.id, steps[currentStepIdx], `Paused for merchant approval before action batch: ${currentStepLabel}`, 'waiting');

  return {
    planId: plan.id,
    status: 'awaiting_approval',
    log: `Paused for merchant approval before action batch: ${currentStepLabel}`,
  };
}

async function finalizeTerminalResult(context: MissionRuntimeContext, result: MissionStepResult): Promise<MissionProcessorResult> {
  const { plan, intent, steps, currentStepIdx } = context;
  const terminalStatus = result.terminalStatus || 'completed';

  await updatePlanState(plan.id, {
    status: terminalStatus,
  });

  if (result.intentStatus) {
    await updateIntentState(intent.id, {
      status: result.intentStatus,
      constraints: mergeIntentWorkflow(intent.constraints, {
        phase: terminalStatus === 'completed' ? 'completed' : terminalStatus === 'cancelled' ? 'cancelled' : 'blocked',
        nextAction: terminalStatus === 'completed'
          ? 'Mission completed. Review the outputs and outcomes.'
          : 'Mission stopped before finishing.',
        resultSummary: result.logMessage,
        blockingReason: terminalStatus === 'completed' ? null : result.logMessage,
        pendingApprovalKind: null,
        pendingActionBatch: null,
        pendingBatchLabel: null,
        pendingBatchIndex: null,
      }),
    });
  }

  await logMissionAction(plan.id, steps[currentStepIdx], result.logMessage, terminalStatus);
  return { planId: plan.id, status: terminalStatus, log: result.logMessage };
}

async function advanceMissionPlan(context: MissionRuntimeContext, result: MissionStepResult): Promise<MissionProcessorResult> {
  const { plan, intent, steps, currentStepIdx } = context;
  const nextStepIdx = currentStepIdx + 1;
  const isLastStep = nextStepIdx >= steps.length;

  await updatePlanState(plan.id, {
    current_step: nextStepIdx,
    status: isLastStep ? 'completed' : 'in_progress',
  });

  if (isLastStep) {
    await updateIntentState(intent.id, {
      status: 'completed',
      constraints: mergeIntentWorkflow(intent.constraints, {
        phase: 'completed',
        nextAction: 'Mission completed. Review the outputs and outcomes.',
        resultSummary: result.logMessage,
        blockingReason: null,
        pendingApprovalKind: null,
        pendingActionBatch: null,
        pendingBatchLabel: null,
        pendingBatchIndex: null,
      }),
    });
  }

  await logMissionAction(plan.id, steps[currentStepIdx], result.logMessage, 'success');
  return { planId: plan.id, status: 'advanced', log: result.logMessage };
}

async function waitMissionPlan(context: MissionRuntimeContext, result?: MissionStepResult | null): Promise<MissionProcessorResult> {
  const { plan, steps, currentStepIdx } = context;
  const logMessage = result?.logMessage || 'Agent observing...';

  await updatePlanState(plan.id, {
    status: 'queued',
  });
  await logMissionAction(plan.id, steps[currentStepIdx], logMessage, 'waiting');
  return { planId: plan.id, status: 'waiting', log: logMessage };
}

async function claimPlan(plan: any): Promise<MissionProcessorResult | null> {
  if (plan.status === 'failed_retryable') {
    const claimedRetry = await tryUpdatePlanState(plan.id, ['failed_retryable'], { status: 'in_progress' });
    if (!claimedRetry) {
      return { planId: plan.id, status: 'in_progress', log: 'Mission is already being processed by another worker.' };
    }
    plan.status = 'in_progress';
    return null;
  }

  if (plan.status === 'planning') {
    if (!plan.is_approved) {
      return { planId: plan.id, status: 'awaiting_approval', log: 'Mission is waiting for merchant approval.' };
    }

    const promoted = await tryUpdatePlanState(plan.id, ['planning'], {
      status: 'queued',
    });
    if (!promoted) {
      return { planId: plan.id, status: 'in_progress', log: 'Mission state changed before execution could start.' };
    }
    plan.status = 'queued';
  }

  if (plan.status === 'in_progress') {
    return { planId: plan.id, status: 'in_progress', log: 'Mission is already being processed by another worker.' };
  }

  if (!RETRYABLE_STATUSES.includes(String(plan.status))) {
    return { planId: plan.id, status: String(plan.status), log: 'Mission is not executable in the current state.' };
  }

  const claimed = await tryUpdatePlanState(plan.id, ['queued'], {
    status: 'in_progress',
  });
  if (!claimed) {
    return { planId: plan.id, status: 'in_progress', log: 'Mission is already being processed by another worker.' };
  }

  plan.status = 'in_progress';
  return null;
}

async function executeMissionStep(context: MissionRuntimeContext): Promise<MissionStepResult | null> {
  const brief = getMissionBrief(context.intent.constraints);

  if (brief?.executionMode === 'analysis_only') {
    return buildAnalysisOnlyResult(context);
  }

  const executors = [
    runSignalMissionStep,
    runCatalogMissionStep,
    runRevenueMissionStep,
    runNotificationMissionStep,
    runSupportMissionStep,
  ];

  for (const executor of executors) {
    const result = await executor(context);
    if (result) {
      return result;
    }
  }

  return buildAnalysisOnlyResult(context);
}

async function executeOpenEndedMissionStep(
  context: MissionRuntimeContext,
  planDocument: MissionPlanDocument
): Promise<MissionProcessorResult | MissionStepResult> {
  const step = planDocument.steps[context.currentStepIdx];
  if (!step) {
    return {
      actionTaken: false,
      terminalStatus: 'blocked',
      intentStatus: 'active',
      logMessage: 'Mission step is missing from the stored plan document.',
    };
  }

  const action = findPlanAction(planDocument, step);
  if (step.kind === 'analysis' && (!action || action.readOnly)) {
    let nextPlanDocument = planDocument;
    let logMessage = step.expectedOutput || step.reasoning || `Completed analysis step: ${step.title}`;

    if (action) {
      const execution = await executeMissionAction(context.merchant, action);
      logMessage = execution.summary || logMessage;
      nextPlanDocument = appendPlanResult(planDocument, step.id, logMessage, action.id);
    } else {
      nextPlanDocument = appendPlanResult(planDocument, step.id, logMessage, null);
    }

    await updateIntentState(context.intent.id, {
      constraints: updatePlanDocument(context.intent.constraints, nextPlanDocument, {
        resultSummary: logMessage,
      }),
    });

    return {
      actionTaken: true,
      logMessage,
    };
  }

  if (!action) {
    return {
      actionTaken: false,
      terminalStatus: 'blocked',
      intentStatus: 'active',
      logMessage: `Mission step "${step.title}" has no valid executable action.`,
    };
  }

  const currentBatch = findApprovalBatch(planDocument, step.id);

  if (action.approvalRequired) {
    if (!currentBatch || currentBatch.status === 'pending') {
      const preview = currentBatch?.preview || await previewMissionAction(context.merchant, action);
      const batch: ApprovedMissionBatch = currentBatch || {
        id: `batch_${context.plan.id}_${step.id}`,
        stepId: step.id,
        title: action.title,
        status: 'pending',
        action,
        preview,
      };
      const nextPlanDocument = upsertApprovalBatch(planDocument, batch);

      await updatePlanState(context.plan.id, {
        status: 'blocked',
      });
      await updateIntentState(context.intent.id, {
        constraints: updatePlanDocument(context.intent.constraints, nextPlanDocument, {
          phase: 'awaiting_action_batch',
          pendingApprovalKind: 'write_batch',
          pendingBatchLabel: batch.title,
          pendingBatchIndex: context.currentStepIdx,
          pendingActionBatch: batch,
          latestApprovalStatus: 'pending',
          nextAction: `Approve the "${batch.title}" action batch to continue execution.`,
          blockingReason: 'Mission is waiting for approval on the next store-changing action batch.',
          resultSummary: null,
        }),
      });
      await appendAssistantTaskUpdateByPlanId({
        planId: context.plan.id,
        content: preview.summary,
        messageType: 'approval_request',
        status: 'waiting',
        actions: [
          {
            id: `approve:${context.plan.id}`,
            label: 'Approve',
            kind: 'approve',
            payload: { planId: context.plan.id },
          },
          {
            id: `reject:${context.plan.id}`,
            label: 'Reject',
            kind: 'reject',
            payload: { planId: context.plan.id },
          },
        ],
        metadata: {
          riskSummary: preview.riskSummary || null,
          batchTitle: batch.title,
        },
      });
      await syncAssistantTaskThreadStatusByPlanId(context.plan.id);
      await logMissionAction(context.plan.id, step.title, `Paused for merchant approval: ${preview.summary}`, 'waiting');

      return {
        planId: context.plan.id,
        status: 'awaiting_approval',
        log: `Paused for merchant approval: ${preview.summary}`,
      };
    }

    if (currentBatch.status === 'approved') {
      const execution = await executeMissionAction(context.merchant, currentBatch.action);
      const nextPlanDocument = appendPlanResult(
        upsertApprovalBatch(planDocument, {
          ...currentBatch,
          status: 'executed',
          executedAt: new Date().toISOString(),
        }),
        step.id,
        execution.summary,
        currentBatch.action.id
      );

      await updateIntentState(context.intent.id, {
        constraints: updatePlanDocument(context.intent.constraints, nextPlanDocument, {
          phase: 'executing',
          pendingApprovalKind: null,
          pendingBatchLabel: null,
          pendingBatchIndex: null,
          pendingActionBatch: null,
          latestApprovalStatus: 'approved',
          nextAction: null,
          blockingReason: null,
          resultSummary: execution.summary,
        }),
      });

      return {
        actionTaken: true,
        logMessage: execution.summary,
      };
    }

    if (currentBatch.status === 'executed') {
      return {
        actionTaken: true,
        logMessage: `Action batch "${currentBatch.title}" was already executed.`,
      };
    }

    return {
      actionTaken: false,
      terminalStatus: 'blocked',
      intentStatus: 'active',
      logMessage: currentBatch.rejectionReason || `Action batch "${currentBatch.title}" was rejected and needs replanning.`,
    };
  }

  const execution = await executeMissionAction(context.merchant, action);
  const nextPlanDocument = appendPlanResult(planDocument, step.id, execution.summary, action.id);
  await updateIntentState(context.intent.id, {
    constraints: updatePlanDocument(context.intent.constraints, nextPlanDocument, {
      phase: 'executing',
      blockingReason: null,
      resultSummary: execution.summary,
    }),
  });

  return {
    actionTaken: true,
    logMessage: execution.summary,
  };
}

async function processMissionPlanStep(plan: any): Promise<MissionProcessorResult> {
  const intent = plan.customer_intents;
  const merchant = intent.merchants;
  const steps = plan.steps || [];
  const currentStepIdx = Number(plan.current_step || 0);
  const planDocument = getPlanDocument(intent.constraints);

  const preflightResult = await claimPlan(plan);
  if (preflightResult) {
    if (preflightResult.status !== 'queued' || plan.status === 'planning') {
      return preflightResult;
    }
  }

  if (currentStepIdx >= steps.length) {
    await updatePlanState(plan.id, { status: 'completed' });
    await updateIntentState(intent.id, {
      status: 'completed',
      constraints: mergeIntentWorkflow(intent.constraints, {
        phase: 'completed',
        nextAction: 'Mission completed. Review the outputs and outcomes.',
        resultSummary: 'Mission had no remaining steps.',
        blockingReason: null,
        pendingApprovalKind: null,
        pendingActionBatch: null,
        pendingBatchLabel: null,
        pendingBatchIndex: null,
      }),
    });
    await appendAssistantTaskUpdateByPlanId({
      planId: plan.id,
      content: 'Mission had no remaining steps.',
      messageType: 'result',
      status: 'completed',
    });
    await syncAssistantTaskThreadStatusByPlanId(plan.id);
    return { planId: plan.id, status: 'completed', log: 'Mission had no remaining steps.' };
  }

  const context: MissionRuntimeContext = {
    plan,
    intent,
    merchant,
    steps,
    currentStepIdx,
    currentStepText: String(steps[currentStepIdx] || '').toLowerCase(),
  };

  try {
    if (planDocument?.planVersion === 2) {
      const v2Result = await executeOpenEndedMissionStep(context, planDocument);
      if ('planId' in v2Result) {
        return v2Result;
      }

      if (v2Result?.terminalStatus && v2Result.intentStatus) {
        return finalizeTerminalResult(context, v2Result);
      }

      if (v2Result?.actionTaken) {
        return advanceMissionPlan(context, v2Result);
      }

      return waitMissionPlan(context, v2Result);
    }

    const writeBatchPauseResult = await pauseForWriteBatchApproval(context);
    if (writeBatchPauseResult) {
      return writeBatchPauseResult;
    }

    const stepResult = await executeMissionStep(context);

    if (stepResult?.terminalStatus && stepResult.intentStatus) {
      return finalizeTerminalResult(context, stepResult);
    }

    if (stepResult?.actionTaken) {
      return advanceMissionPlan(context, stepResult);
    }

    return waitMissionPlan(context, stepResult);
  } catch (planError: any) {
    const failureMessage = planError?.message || 'Mission execution failed';

    await updatePlanState(plan.id, {
      status: 'failed',
    });
    await updateIntentState(intent.id, {
      constraints: mergeIntentWorkflow(intent.constraints, {
        phase: 'blocked',
        nextAction: 'Mission hit an execution error. Review the blocker and resume or rerun when ready.',
        blockingReason: failureMessage,
        resultSummary: null,
      }),
    });
    await logMissionAction(plan.id, steps[currentStepIdx], failureMessage, 'failed');
    logger.error('Mission execution step failed:', {
      planId: plan.id,
      intentType: intent.intent_type,
      error: failureMessage,
    });
    return { planId: plan.id, status: 'failed', log: failureMessage };
  }
}

export async function processMissionPlan(plan: any, options?: { maxIterations?: number }): Promise<MissionProcessorResult> {
  const maxIterations = Math.max(1, options?.maxIterations || 6);
  let activePlan = plan;
  let lastResult: MissionProcessorResult = {
    planId: plan.id,
    status: String(plan.status || 'queued'),
    log: 'Mission queued for processing.',
  };

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    lastResult = await processMissionPlanStep(activePlan);
    if (lastResult.status !== 'advanced') {
      return lastResult;
    }

    const refreshedPlan = await fetchMissionPlan(activePlan.id);
    if (!refreshedPlan) {
      return {
        planId: activePlan.id,
        status: 'completed',
        log: 'Mission no longer requires processing.',
      };
    }

    activePlan = refreshedPlan;
  }

  return {
    planId: activePlan.id,
    status: 'queued',
    log: 'Mission has more work queued for the next execution window.',
  };
}

export async function processMissionPlanById(planId: string, options?: { maxIterations?: number }) {
  const plan = await fetchMissionPlan(planId);
  if (!plan) {
    return null;
  }

  return processMissionPlan(plan, options);
}
