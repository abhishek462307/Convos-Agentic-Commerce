import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';
import { getMcpJwtSecret } from '@/lib/mcp-jwt';

export async function POST(req: NextRequest) {
  // Check Content-Type (can be multipart/form-data or application/x-www-form-urlencoded)
    const contentType = req.headers.get('content-type') || '';
    let body: any = {};
    
    // Support client_secret_basic (base64 in Authorization header)
    let clientIdFromHeader = '';
    let clientSecretFromHeader = '';
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('basic ')) {
      try {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
        const [id, secret] = decoded.split(':');
        clientIdFromHeader = id;
        clientSecretFromHeader = secret;
      } catch (e) {
        // basic auth decode failed
      }
    }

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    } else {
      try {
        body = await req.json();
      } catch (e) {
        // Fallback to empty body
      }
    }

    const grant_type = body.grant_type || '';
    const code = body.code || '';
    const client_id = body.client_id || clientIdFromHeader;
    const client_secret = body.client_secret || clientSecretFromHeader;
    const redirect_uri = body.redirect_uri || '';
    const refresh_token = body.refresh_token || '';


  if (grant_type === 'authorization_code') {
    if (!code || !client_id || !client_secret || !redirect_uri) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    let decodedCode: any;
    try {
      decodedCode = jwt.verify(code, getMcpJwtSecret(), { audience: client_id });
    } catch (e) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    if (
      decodedCode?.type !== 'mcp_auth_code' ||
      decodedCode?.clientId !== client_id ||
      decodedCode?.redirectUri !== redirect_uri
    ) {
      return NextResponse.json({ error: 'Invalid authorization code binding' }, { status: 400 });
    }

    const { merchantId } = decodedCode;

    // Validate client_id and client_secret
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, mcp_client_secret')
      .eq('id', merchantId)
      .eq('mcp_client_id', client_id)
      .single();

    if (merchantError || !merchant || merchant.mcp_client_secret !== client_secret) {
      return NextResponse.json({ error: 'Invalid client credentials' }, { status: 401 });
    }

    // Generate access_token (JWT)
    const accessToken = jwt.sign(
      { merchantId, type: 'mcp_access' },
      getMcpJwtSecret(),
      { expiresIn: '30d' } // Long-lived for ChatGPT convenience
    );

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 2592000, // 30 days
      scope: 'admin'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } else if (grant_type === 'refresh_token') {
    // Refresh token not implemented for now, as we use long-lived access tokens
    return NextResponse.json({ error: 'Grant type not supported' }, { 
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  return NextResponse.json({ error: 'Invalid grant_type' }, { 
    status: 400,
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
