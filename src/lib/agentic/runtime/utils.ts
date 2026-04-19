import { supabaseAdmin } from '@/lib/supabase-admin';
import { appendAssistantTaskUpdateByPlanId, syncAssistantTaskThreadStatusByPlanId } from '@/lib/merchant-assistant';
import logger from '@/lib/logger';

export const RETRYABLE_STATUSES = ['queued', 'in_progress', 'failed_retryable'];
export const MAX_MISSION_ATTEMPTS = 3;
let missionActionLogsAvailable: 'unknown' | 'available' | 'missing' = 'unknown';

export function getRetryDelayMs(attemptCount: number) {
  return Math.min(60 * 60 * 1000, Math.max(60_000, 2 ** Math.max(attemptCount - 1, 0) * 60_000));
}

export async function updatePlanState(planId: string, updates: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('agent_plans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId);

  if (error) {
    throw error;
  }
}

export async function updateIntentState(intentId: string, updates: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('customer_intents')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', intentId);

  if (error) {
    throw error;
  }
}

export async function tryUpdatePlanState(
  planId: string,
  expectedStatuses: string[],
  updates: Record<string, unknown>
) {
  const { data, error } = await supabaseAdmin
    .from('agent_plans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .in('status', expectedStatuses)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function logMissionAction(planId: string, actionType: string, description: string, status: string) {
  if (missionActionLogsAvailable === 'missing') {
    return;
  }

  const { error } = await supabaseAdmin
    .from('agent_action_logs')
    .insert({
      plan_id: planId,
      action_type: actionType,
      description,
      status,
    });

  if (error) {
    if (String(error.message || '').includes('agent_action_logs')) {
      missionActionLogsAvailable = 'missing';
      logger.warn('Mission action log table is unavailable; mission execution will continue without persisted step logs.', {
        planId,
        error: error.message,
      });
      return;
    }

    throw error;
  }

  missionActionLogsAvailable = 'available';

  if (!(status === 'waiting' && /merchant approval/i.test(description))) {
    const messageType = status === 'failed' || status === 'cancelled'
      ? 'error'
      : status === 'completed'
        ? 'result'
        : 'execution_update';

    await appendAssistantTaskUpdateByPlanId({
      planId,
      content: description,
      messageType,
      status,
      metadata: {
        actionType,
      },
    });
  }

  await syncAssistantTaskThreadStatusByPlanId(planId);
}

export async function fetchMissionPlan(planId: string) {
  const { data: plan, error } = await supabaseAdmin
    .from('agent_plans')
    .select('id, intent_id, steps, status, is_approved, is_sponsored, created_at, current_step, updated_at')
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!plan?.intent_id) {
    return plan;
  }

  const { data: intent, error: intentError } = await supabaseAdmin
    .from('customer_intents')
    .select('*')
    .eq('id', plan.intent_id)
    .maybeSingle();

  if (intentError) {
    throw intentError;
  }

  if (!intent?.merchant_id) {
    return {
      ...plan,
      customer_intents: intent,
    };
  }

  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', intent.merchant_id)
    .maybeSingle();

  if (merchantError) {
    throw merchantError;
  }

  return {
    ...plan,
    customer_intents: {
      ...intent,
      merchants: merchant,
    },
  };
}

export async function sendInternalEmail(payload: {
  to: string
  subject: string
  html: string
  merchantId?: string
  subdomain?: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return fetch(`${appUrl}/api/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.EMAIL_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET || '',
    },
    body: JSON.stringify(payload),
  });
}
