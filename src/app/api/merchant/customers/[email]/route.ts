import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantCustomerDetail } from '@/lib/merchant-panel';

export async function GET(
  request: Request,
  context: { params: Promise<{ email: string }> }
) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { email } = await context.params;
  const detail = await getMerchantCustomerDetail(result.context.merchantId, decodeURIComponent(email));

  return NextResponse.json(detail);
}
