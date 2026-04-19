import { NextResponse } from 'next/server';
import { generateMcpApiKey } from '@/lib/mcp-credentials';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const result = await resolveMerchantContext(request, 'settings');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .update({ mcp_api_key: generateMcpApiKey() })
    .eq('id', result.context.merchantId)
    .select('id, mcp_api_key')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, merchant: data });
}
