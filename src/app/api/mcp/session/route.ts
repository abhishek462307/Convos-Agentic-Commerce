import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';
import { getMcpJwtSecret } from '@/lib/mcp-jwt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get('merchantId');

  if (!authHeader || !merchantId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Verify Supabase session (Bearer token is the user's access_token)
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user owns this merchant
  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', merchantId)
    .single();

  if (merchantError || !merchant) {
    return NextResponse.json({ error: 'Merchant not found for this user' }, { status: 404 });
  }

  // Create a session token (short-lived, e.g. 24 hours)
  const sessionToken = jwt.sign(
    { 
      type: 'mcp_session',
      merchantId: merchant.id,
      userId: user.id
    },
    getMcpJwtSecret(),
    { expiresIn: '24h' }
  );

  return NextResponse.json({ sessionToken });
}
