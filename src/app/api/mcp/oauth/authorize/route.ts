import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase-server';
import jwt from 'jsonwebtoken';
import { getMcpJwtSecret } from '@/lib/mcp-jwt';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const responseType = searchParams.get('response_type');

  if (!clientId || !redirectUri || responseType !== 'code') {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  // Find merchant by client_id
  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('id, user_id')
    .eq('mcp_client_id', clientId)
    .single();

  if (merchantError || !merchant) {
    return NextResponse.json({ error: 'Invalid client_id' }, { status: 401 });
  }

  // Check if user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login page with returnTo param
    const returnTo = encodeURIComponent(req.url);
    return NextResponse.redirect(new URL(`/login?returnTo=${returnTo}`, req.url));
  }

  // Ensure user is the owner of this merchant
  if (user.id !== merchant.user_id) {
    return NextResponse.json({ error: 'Unauthorized user for this client' }, { status: 403 });
  }

  const code = jwt.sign(
      {
        type: 'mcp_auth_code',
        merchantId: merchant.id,
        userId: user.id,
        clientId,
        redirectUri,
      },
    getMcpJwtSecret(),
    {
      expiresIn: '10m',
      audience: clientId,
      subject: user.id,
    }
  );

  // Redirect back to ChatGPT's redirect_uri
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.append('code', code);
  if (state) callbackUrl.searchParams.append('state', state);

  return NextResponse.redirect(callbackUrl);
}
