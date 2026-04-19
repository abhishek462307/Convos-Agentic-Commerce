import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';
import { rateLimit } from '@/lib/rate-limit';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const appHost = (() => {
  const value = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/^www\./, '').toLowerCase();
  }
})();
const EXPECTED_CNAME = appHost || '';
const EXPECTED_A_RECORDS = (process.env.CUSTOM_DOMAIN_A_RECORDS || '')
  .split(',')
  .map((record) => record.trim())
  .filter(Boolean);

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || user.id;
    const { allowed } = rateLimit(`verify-domain:${ip}`, { maxRequests: 10, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { merchantId, domain } = await request.json();

    if (!merchantId || !domain) {
      return NextResponse.json({ error: 'Missing merchantId or domain' }, { status: 400 });
    }

    const access = await getMerchantAccess(user.id, merchantId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, custom_domain')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    if (merchant.custom_domain !== domain) {
      return NextResponse.json({ error: 'Domain mismatch' }, { status: 400 });
    }

    const isRootDomain = domain.split('.').length === 2;
    const results: { type: string; found: string[]; expected: string; match: boolean }[] = [];

    // Check CNAME (for subdomains or www)
    if (EXPECTED_CNAME) {
      try {
        const cnameRecords = await resolveCname(domain);
        const cnameMatch = cnameRecords.some(
          (r) => r.toLowerCase() === EXPECTED_CNAME || r.toLowerCase().endsWith(`.${EXPECTED_CNAME}`)
        );
        results.push({
          type: 'CNAME',
          found: cnameRecords,
          expected: EXPECTED_CNAME,
          match: cnameMatch,
        });
      } catch (e: any) {
        if (e.code !== 'ENODATA' && e.code !== 'ENOTFOUND') {
          results.push({ type: 'CNAME', found: [], expected: EXPECTED_CNAME, match: false });
        }
      }
    }

    // Check A records (for root domains)
    if (isRootDomain && EXPECTED_A_RECORDS.length > 0) {
      try {
        const aRecords = await resolve4(domain);
        const aMatch = EXPECTED_A_RECORDS.some((expected) =>
          aRecords.some((r) => r === expected)
        );
        results.push({
          type: 'A',
          found: aRecords,
          expected: EXPECTED_A_RECORDS[0],
          match: aMatch,
        });
      } catch (e: any) {
        if (e.code !== 'ENODATA' && e.code !== 'ENOTFOUND') {
          results.push({ type: 'A', found: [], expected: EXPECTED_A_RECORDS[0], match: false });
        }
      }
    }

    // Also check www variant for root domains
    if (isRootDomain && EXPECTED_CNAME) {
      try {
        const wwwRecords = await resolveCname(`www.${domain}`);
        const wwwMatch = wwwRecords.some(
          (r) => r.toLowerCase() === EXPECTED_CNAME || r.toLowerCase().endsWith(`.${EXPECTED_CNAME}`)
        );
        results.push({
          type: 'CNAME (www)',
          found: wwwRecords,
          expected: EXPECTED_CNAME,
          match: wwwMatch,
        });
      } catch {
        // www CNAME is optional for verification
      }
    }

    const isVerified = results.length > 0 ? results.some((r) => r.match) : false;

    if (isVerified) {
      await supabase
        .from('merchants')
        .update({ domain_verified: true })
        .eq('id', merchantId);

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Domain verified successfully!',
        records: results,
      });
    }

    // Build helpful error message
    let message = 'DNS records not found yet. ';
    if (results.length === 0) {
      message += 'No DNS records detected — make sure you\'ve added the records at your domain provider and allow up to 48 hours for propagation.';
    } else {
      const wrongRecords = results.filter((r) => r.found.length > 0 && !r.match);
      if (wrongRecords.length > 0) {
        const wrong = wrongRecords[0];
        message += `Found ${wrong.type} record pointing to ${wrong.found[0]}, but it should point to ${wrong.expected}.`;
      } else {
        message += 'Records may still be propagating. This can take 5 minutes to 48 hours depending on your provider.';
      }
    }

    return NextResponse.json({
      success: true,
      verified: false,
      message,
      records: results,
    });
  } catch (err: any) {
    logger.error('Domain verification error:', err);
    return NextResponse.json(
      { error: err.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
