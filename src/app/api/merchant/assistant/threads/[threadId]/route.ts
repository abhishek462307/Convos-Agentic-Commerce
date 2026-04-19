import { resolveMerchantContext } from '@/lib/merchant-context';
import { apiError, apiSuccess } from '@/lib/agentic/route';
import {
  deleteMerchantAssistantTask,
  ensureMainAssistantThread,
  getMerchantAssistantThread,
} from '@/lib/merchant-assistant';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const { threadId } = await params;
  if (!threadId) {
    return apiError('threadId is required');
  }

  const thread = await getMerchantAssistantThread(result.context.merchant, threadId);
  if (!thread) {
    return apiError('Assistant thread not found', 404);
  }

  return apiSuccess({ thread });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const canManageMissions = result.context.isOwner
    || result.context.permissions.includes('*')
    || result.context.permissions.includes('settings');

  if (!canManageMissions) {
    return apiError('Forbidden', 403);
  }

  const { threadId } = await params;
  if (!threadId) {
    return apiError('threadId is required');
  }

  try {
    await deleteMerchantAssistantTask({
      merchant: result.context.merchant,
      threadId,
    });

    const mainThread = await ensureMainAssistantThread(result.context.merchant);
    return apiSuccess({
      success: true,
      mainThreadId: mainThread.id,
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Failed to delete task thread');
  }
}
