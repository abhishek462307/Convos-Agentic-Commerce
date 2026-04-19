import { NextRequest, NextResponse } from 'next/server';
import { generateMcpApiKey } from '@/lib/mcp-credentials';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('id, subdomain, custom_domain, domain_verified, mcp_api_key')
    .eq('user_id', user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  let apiKey = merchant.mcp_api_key || '';
  if (!apiKey) {
    apiKey = generateMcpApiKey();
    const { error: updateError } = await supabaseAdmin
      .from('merchants')
      .update({ mcp_api_key: apiKey })
      .eq('id', merchant.id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to create MCP API key' }, { status: 500 });
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const customDomainBase =
    merchant.custom_domain && merchant.domain_verified
      ? `https://${merchant.custom_domain}`
      : null;
  const endpointBase = customDomainBase || baseUrl;

  return NextResponse.json({
    apiKey,
    endpoints: {
      store: `${endpointBase}/api/mcp/${merchant.id}`,
      admin: `${endpointBase}/api/mcp/admin?merchantId=${merchant.id}`
    }
  });
}
