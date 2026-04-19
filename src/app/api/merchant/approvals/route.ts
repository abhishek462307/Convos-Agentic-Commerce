import { resolveMerchantContext } from '@/lib/merchant-context';
import { apiError, apiSuccess } from '@/lib/agentic/route';
import { listPendingDecisionApprovals } from '@/lib/agentic/approvals';
import { applyDecisionApprovalAction } from '@/lib/domain/decision-approvals';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const approvals = await listPendingDecisionApprovals(result.context.merchantId);
  return apiSuccess({ approvals });
}

export async function POST(request: Request) {
  const result = await resolveMerchantContext(request, 'settings');
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const body = await request.json().catch(() => ({}));
  if (body?.kind === 'mission') {
    return apiError('Mission approvals are no longer available', 410);
  }

  if (body?.kind !== 'decision' || !body?.decisionLogId || !body?.action) {
    return apiError('Invalid approval payload');
  }

  try {
    await applyDecisionApprovalAction({
      merchantId: result.context.merchantId,
      decisionLogId: body.decisionLogId,
      action: body.action,
      reason: body.reason || null,
    });
    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiError(error.message || 'Failed to update decision approval');
  }
}
