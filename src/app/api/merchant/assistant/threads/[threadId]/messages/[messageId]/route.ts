import { resolveMerchantContext } from '@/lib/merchant-context';
import { apiError, apiSuccess } from '@/lib/agentic/route';
import { deleteMerchantAssistantMessage } from '@/lib/merchant-assistant';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ threadId: string; messageId: string }> }
) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const { threadId, messageId } = await params;
  if (!threadId || !messageId) {
    return apiError('threadId and messageId are required');
  }

  try {
    const thread = await deleteMerchantAssistantMessage({
      merchant: result.context.merchant,
      threadId,
      messageId,
    });

    return apiSuccess({ thread });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Failed to delete assistant message');
  }
}
