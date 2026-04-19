import { resolveMerchantContext } from '@/lib/merchant-context';
import { apiError, apiSuccess } from '@/lib/agentic/route';
import { getMerchantAssistantThread, sendMerchantAssistantMessage } from '@/lib/merchant-assistant';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const { threadId } = await params;
  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const routeContext = typeof body?.routeContext === 'string' ? body.routeContext : null;
  const actionPayload = body?.actionPayload && typeof body.actionPayload === 'object' && !Array.isArray(body.actionPayload)
    ? body.actionPayload as Record<string, unknown>
    : null;

  if (!threadId || !message) {
    return apiError('threadId and message are required');
  }

  try {
    const outcome = await sendMerchantAssistantMessage({
      merchant: result.context.merchant,
      threadId,
      message,
      routeContext,
      actionPayload,
      requestUrl: request.url,
      cookieHeader: request.headers.get('cookie'),
    });

    const nextThread = outcome.focusThreadId
      ? await getMerchantAssistantThread(result.context.merchant, outcome.focusThreadId)
      : await getMerchantAssistantThread(result.context.merchant, threadId);

    return apiSuccess({
      thread: nextThread,
      focusThreadId: outcome.focusThreadId || threadId,
      navigateTo: outcome.navigateTo || null,
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Failed to send assistant message');
  }
}
