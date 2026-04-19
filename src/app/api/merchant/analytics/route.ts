import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantAnalyticsData } from '@/lib/merchant-panel';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');
  const normalizedPeriod = period === 'day' || period === 'month' ? period : 'week';
  const data = await getMerchantAnalyticsData(result.context.merchantId, normalizedPeriod);

  return NextResponse.json(data);
}
