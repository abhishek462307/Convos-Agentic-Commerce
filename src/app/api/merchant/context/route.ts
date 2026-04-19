import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';

function redactMerchantForClient(merchant: Record<string, unknown>) {
  return {
    ...merchant,
    ai_api_key_set: Boolean(merchant.ai_api_key),
    ai_api_key: undefined,
    smtp_password: undefined,
    mcp_api_key: undefined,
  };
}

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ...result.context,
    merchant: redactMerchantForClient(result.context.merchant as unknown as Record<string, unknown>),
  });
}
