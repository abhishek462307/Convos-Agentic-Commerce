import { apiError } from '@/lib/agentic/route';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  void request;
  void params;
  return apiError('Mission approvals are no longer available', 410);
}
