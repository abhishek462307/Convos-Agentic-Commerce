import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantIntelligenceData } from '@/lib/merchant-panel';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const data = await getMerchantIntelligenceData(result.context.merchantId);
  return NextResponse.json(data);
}
