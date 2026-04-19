import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantOrderDetail } from '@/lib/merchant-panel';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id } = await context.params;
  const detail = await getMerchantOrderDetail(result.context.merchantId, id);

  return NextResponse.json(detail);
}
