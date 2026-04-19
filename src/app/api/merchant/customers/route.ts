import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantCustomersPage } from '@/lib/merchant-panel';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { searchParams } = new URL(request.url);
  const page = await getMerchantCustomersPage(result.context.merchantId, searchParams);

  return NextResponse.json(page);
}
