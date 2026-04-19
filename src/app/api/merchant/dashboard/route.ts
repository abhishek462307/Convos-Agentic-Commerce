import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantDashboardData } from '@/lib/merchant-panel';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get('days');
  const dateRangeDays = (daysParam === '30' ? 30 : daysParam === '1' ? 1 : 7) as 1 | 7 | 30;
  const summary = await getMerchantDashboardData(result.context.merchant, dateRangeDays);

  return NextResponse.json(summary);
}
