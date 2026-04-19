import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // ChatGPT registers a client. We'll return a generic one for now.
  // In a real system, you'd store this in a database.
  const clientSecret = process.env.MCP_CLIENT_SECRET;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!clientSecret) {
    return NextResponse.json(
      { error: 'MCP client secret is not configured' },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json({
    client_id: 'chatgpt_mcp_client',
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post'
  }, {
    headers: corsHeaders
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
