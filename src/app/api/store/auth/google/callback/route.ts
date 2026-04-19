import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function readOAuthStateCookie(request: NextRequest) {
  return request.cookies.get('store_oauth_state')?.value || null;
}

function clearOAuthStateCookie(response: NextResponse) {
  response.cookies.set('store_oauth_state', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

function parseState(stateParam: string | null, request: NextRequest) {
  if (!stateParam) {
    return null;
  }

  const cookieState = readOAuthStateCookie(request);
  if (!cookieState || cookieState !== stateParam) {
    return null;
  }

  try {
    const parsed = JSON.parse(stateParam) as { subdomain?: string; redirect?: string; nonce?: string; issuedAt?: number };
    if (!parsed.subdomain || !parsed.nonce || !parsed.issuedAt) {
      return null;
    }
    if (Date.now() - parsed.issuedAt > 10 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const state = parseState(stateParam, request);

    if (errorParam) {
      const subdomain = state?.subdomain || '';
      return clearOAuthStateCookie(
        NextResponse.redirect(new URL(`/store/${subdomain}/login?error=${encodeURIComponent(errorParam)}`, request.url))
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const { subdomain, redirect } = state;

    if (!subdomain) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id, store_name, auth_settings')
      .eq('subdomain', subdomain)
      .single();

    if (!merchant) {
      return clearOAuthStateCookie(
        NextResponse.redirect(new URL(`/store/${subdomain}/login?error=store_not_found`, request.url))
      );
    }

    const authSettings = merchant.auth_settings || {};
    const clientId = authSettings.google_client_id;
    const clientSecret = authSettings.google_client_secret;

    if (!clientId || !clientSecret) {
      return clearOAuthStateCookie(
        NextResponse.redirect(new URL(`/store/${subdomain}/login?error=google_not_configured`, request.url))
      );
    }

    const redirectUri = `${new URL(request.url).origin}/api/store/auth/google/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(`/store/${subdomain}/login?error=${encodeURIComponent(tokenData.error_description || 'token_exchange_failed')}`, request.url)
      );
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    if (!userInfo.email) {
      return NextResponse.redirect(new URL(`/store/${subdomain}/login?error=no_email`, request.url));
    }

    const email = userInfo.email.toLowerCase();
    const name = userInfo.name || '';

    const { data: existingCustomer } = await supabaseAdmin
      .from('store_customers')
      .select('id, user_id, is_verified')
      .eq('merchant_id', merchant.id)
      .eq('email', email)
      .single();

    let userId = existingCustomer?.user_id;

    if (!userId) {
      const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingAuth?.users?.find(u => u.email === email) || null;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { name, role: 'store_customer', merchant_id: merchant.id },
        });
        if (createError) {
          return NextResponse.redirect(new URL(`/store/${subdomain}/login?error=account_creation_failed`, request.url));
        }
        userId = newUser?.user?.id;
      }
    }

    if (!userId) {
        return NextResponse.redirect(new URL(`/store/${subdomain}/login?error=user_id_missing`, request.url));
    }

    let customerId = '';
    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabaseAdmin
        .from('store_customers')
        .update({
          user_id: userId,
          is_verified: true,
          name: existingCustomer.is_verified ? undefined : name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCustomer.id);
    } else {
      const { data: newCustomer } = await supabaseAdmin
        .from('store_customers')
        .insert({
          merchant_id: merchant.id,
          user_id: userId,
          email,
          name,
          is_verified: true,
        })
        .select('id')
        .single();
      customerId = newCustomer?.id || '';
    }

    const redirectPath = redirect === 'checkout' ? 'checkout' : '';
    const storeUrl = `${new URL(request.url).origin}/store/${subdomain}${redirectPath ? `/${redirectPath}` : ''}`;

    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: storeUrl }
    });

    const actionLink = linkData?.properties?.action_link || '';

    const callbackHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Signing in...</title></head>
      <body>
        <script>
          try {
            const customerData = ${JSON.stringify({
              id: customerId,
              email,
              name,
            })};
            localStorage.setItem('consumer_email_${subdomain}', '${email}');
            localStorage.setItem('store_auth_${subdomain}', JSON.stringify({ 
              user: customerData,
              authenticated: true,
              provider: 'google'
            }));
          } catch(e) {}
          window.location.href = '${actionLink || storeUrl}';
        </script>
        <p>Signing you in...</p>
      </body>
      </html>
    `;

    return clearOAuthStateCookie(new NextResponse(callbackHtml, {
      headers: { 'Content-Type': 'text/html' },
    }));
  } catch (error) {
    logger.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=oauth_failed', request.url));
  }
}
