import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get('merchantId');
  
  // The resource must match what the client is requesting
  const resource = `${baseUrl}/api/mcp/admin${merchantId ? `?merchantId=${merchantId}` : ''}`;
  
  return NextResponse.json({
    resource,
    authorization_servers: [`${baseUrl}/api/mcp/metadata/auth`],
    scopes_supported: ['admin'],
    resource_documentation: `${baseUrl}/docs/mcp`
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
