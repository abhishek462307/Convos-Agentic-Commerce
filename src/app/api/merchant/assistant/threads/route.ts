import { resolveMerchantContext } from '@/lib/merchant-context';
import { apiError, apiSuccess } from '@/lib/agentic/route';
import {
  ensureMainAssistantThread,
  getMerchantAssistantThread,
  listMerchantAssistantThreads,
} from '@/lib/merchant-assistant';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const mainThread = await ensureMainAssistantThread(result.context.merchant);
  const threads = await listMerchantAssistantThreads(result.context.merchant);

  return apiSuccess({
    threads,
    activeThreadId: threads[0]?.id || mainThread.id,
    mainThreadId: mainThread.id,
  });
}

export async function POST(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const body = await request.json().catch(() => ({}));
  const missionId = typeof body?.missionId === 'string' ? body.missionId : null;
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

  try {
    if (missionId || prompt) {
      return apiError('The missions system has been removed.', 410);
    }

    const mainThread = await ensureMainAssistantThread(result.context.merchant);
    const thread = await getMerchantAssistantThread(result.context.merchant, mainThread.id);
    return apiSuccess({ thread });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Failed to create assistant thread');
  }
}
