import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const domainCache = new Map<string, { storePath: string; ts: number }>();
const CACHE_TTL = 60 * 1000;

const MAIN_DOMAINS = new Set([
  'localhost:3000',
  'localhost:3001',
  'localhost',
  '127.0.0.1',
  'localhost',
  '127.0.0.1',
]);

export async function middleware(request: NextRequest) {
  const hostname = (request.headers.get('host') || '').toLowerCase();
  const pathname = request.nextUrl.pathname;
  const [hostOnly] = hostname.split(':');

  const STOREFRONT_API_ROUTES = [
    '/api/ai',
    '/api/conversations',
    '/api/discounts',
    '/api/store/',
    '/api/mcp/',
  ];

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    const isStorefrontRoute = STOREFRONT_API_ROUTES.some((route) => pathname.startsWith(route));

    if (
      !isStorefrontRoute &&
      pathname.startsWith('/api') &&
      !pathname.startsWith('/api/webhooks') &&
      !pathname.startsWith('/api/migrate') &&
      request.method === 'POST'
    ) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      if (!origin) {
        return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
      }
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  if (
    MAIN_DOMAINS.has(hostname) ||
    hostname.startsWith('localhost:') ||
    hostOnly === 'localhost' ||
    hostname.endsWith('.vercel.app')
  ) {
    return NextResponse.next();
  }

  const lookupHost = hostOnly.replace(/^www\./, '');
  const cached = domainCache.get(lookupHost);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    const url = request.nextUrl.clone();
    url.pathname = `${cached.storePath}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: merchant } = await supabase
      .from('merchants')
      .select('subdomain, domain_verified, custom_domain')
      .eq('custom_domain', lookupHost)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const isLocalDev =
      hostOnly.endsWith('.local') ||
      hostOnly.endsWith('.test') ||
      hostOnly === 'localhost';
    const isVerified = merchant?.domain_verified || isLocalDev;

    if (merchant?.subdomain && isVerified) {
      const storePath = `/store/${merchant.subdomain}`;
      domainCache.set(lookupHost, { storePath, ts: Date.now() });

      if (pathname.startsWith('/store/')) {
        return NextResponse.next();
      }

      const url = request.nextUrl.clone();
      url.pathname = `${storePath}${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
  } catch (error) {
    // domain lookup failed — proceed with default routing
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
