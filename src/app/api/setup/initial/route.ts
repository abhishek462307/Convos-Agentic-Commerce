import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/api-auth';
import { generateMcpApiKey, generateMcpClientId, generateMcpClientSecret } from '@/lib/mcp-credentials';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SetupChecks = {
  database: { ok: boolean; detail: string }
  appUrl: { ok: boolean; detail: string }
  supabase: { ok: boolean; detail: string }
  schema: { ok: boolean; detail: string }
  authRedirect: { ok: boolean; detail: string }
  ai: { ok: boolean; detail: string }
  smtp: { ok: boolean; detail: string }
}

async function detectSchemaStatus() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      detail: 'Missing Supabase env values.',
    };
  }

  try {
    const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await publicClient
      .from('merchants')
      .select('id')
      .limit(1);

    if (!error) {
      return {
        ok: true,
        detail: 'Core merchant schema is available.',
      };
    }

    const message = error.message || '';
    if (message.includes('relation') && message.includes('does not exist')) {
      return {
        ok: false,
        detail: 'Supabase is connected, but the core schema is missing. Run the SQL bootstrap before completing setup.',
      };
    }

    return {
      ok: false,
      detail: `Unable to verify schema readiness: ${message}`,
    };
  } catch (error: any) {
    return {
      ok: false,
      detail: error?.message || 'Unable to verify schema readiness.',
    };
  }
}

function inferDeploymentEnvironment() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL || appUrl.includes('.vercel.app'));
  return {
    appUrl,
    isVercel,
  };
}

async function buildSetupChecks(merchant?: {
  smtp_enabled?: boolean | null
  smtp_host?: string | null
  smtp_from_email?: string | null
} | null): Promise<SetupChecks> {
  const { appUrl, isVercel } = inferDeploymentEnvironment();
  const schema = await detectSchemaStatus();
  const appUrlConfigured = Boolean(appUrl);
  const authRedirectReady = appUrlConfigured;

  return {
    database: {
      ok: true,
      detail: 'Supabase connection available through server credentials.',
    },
    appUrl: {
      ok: appUrlConfigured,
      detail: appUrl || 'Set NEXT_PUBLIC_APP_URL for production.',
    },
    supabase: {
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
      detail: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Supabase env values detected.' : 'Missing Supabase env values.',
    },
    schema,
    authRedirect: {
      ok: authRedirectReady,
      detail: isVercel
        ? (appUrlConfigured
            ? `Add ${appUrl} to Supabase Auth redirect URLs before testing signup and login.`
            : 'Set NEXT_PUBLIC_APP_URL to your Vercel production URL, then add it to Supabase Auth redirect URLs.')
        : (appUrlConfigured
            ? `Confirm ${appUrl} is allowed in Supabase Auth redirect URLs.`
            : 'Set NEXT_PUBLIC_APP_URL, then add it to Supabase Auth redirect URLs.'),
    },
    ai: {
      ok: Boolean(
        process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT_NAME)
      ),
      detail: process.env.OPENAI_API_KEY
        ? 'OpenAI credentials detected.'
        : process.env.ANTHROPIC_API_KEY
          ? 'Anthropic credentials detected.'
          : process.env.AZURE_OPENAI_API_KEY
            ? 'Azure OpenAI credentials detected.'
            : 'Optional until AI flows are enabled.',
    },
    smtp: {
      ok: Boolean((merchant?.smtp_enabled && merchant?.smtp_host && merchant?.smtp_from_email) || (process.env.PLATFORM_SMTP_HOST && process.env.PLATFORM_SMTP_FROM_EMAIL)),
      detail: merchant?.smtp_enabled ? 'Merchant SMTP configured.' : 'Optional unless you need transactional email.',
    },
  };
}


function normalizeSubdomain(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
}

function buildStoreHandle(storeName: string) {
  const fallback = 'store';
  const cleaned = normalizeSubdomain(storeName.replace(/\s+/g, '-'));
  return cleaned.length >= 3 ? cleaned : fallback;
}

async function generateUniqueSubdomain(storeName: string) {
  const base = buildStoreHandle(storeName);
  let candidate = base;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data: match } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('subdomain', candidate)
      .limit(1)
      .maybeSingle();

    if (!match?.id) {
      return candidate;
    }

    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const schema = await detectSchemaStatus();
  if (!schema.ok) {
    const checks = await buildSetupChecks(null);
    return NextResponse.json({
      hasMerchant: false,
      merchantCount: 0,
      merchant: null,
      deployment: inferDeploymentEnvironment(),
      checks,
    });
  }

  const [merchantRes, merchantCountRes] = await Promise.all([
    supabaseAdmin
      .from('merchants')
      .select('id, store_name, subdomain, store_email, currency, locale, smtp_enabled, smtp_host, smtp_from_email, ai_tone, ai_custom_instructions, custom_domain')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const merchant = merchantRes.data;
  const hasMerchant = Boolean(merchant?.id);
  const count = merchantCountRes.count || 0;
  const checks = await buildSetupChecks(merchant);

  return NextResponse.json({
    hasMerchant,
    merchantCount: count,
    merchant,
    deployment: inferDeploymentEnvironment(),
    checks,
  });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const storeName = String(body.storeName || '').trim();
  const storeEmail = String(body.storeEmail || '').trim();
  const industry = String(body.storeIndustry || '').trim() || 'Other';
  const currency = String(body.currency || 'USD');
  const locale = String(body.locale || 'en-US');
  const primaryColor = String(body.primaryColor || '#8b5cf6');
  const aiTone = String(body.aiTone || 'friendly');
  const aiInstructions = String(body.aiCustomInstructions || '').trim();
  const customDomainRaw = String(body.customDomain || '').trim().toLowerCase();
  const customDomain = customDomainRaw
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
  const smtpEnabled = Boolean(body.smtpEnabled);

  if (!storeName || !storeEmail) {
    return NextResponse.json({ error: 'Store name and store email are required.' }, { status: 400 });
  }

  const schema = await detectSchemaStatus();
  if (!schema.ok) {
    return NextResponse.json({ error: schema.detail }, { status: 412 });
  }

  const { count: deploymentMerchantCount } = await supabaseAdmin
    .from('merchants')
    .select('id', { count: 'exact', head: true });

  if ((deploymentMerchantCount || 0) > 0) {
    return NextResponse.json({ error: 'Initial setup is already complete for this deployment.' }, { status: 409 });
  }

  if (customDomain) {
    const { data: domainMatch } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('custom_domain', customDomain)
      .limit(1)
      .maybeSingle();
    if (domainMatch?.id) {
      return NextResponse.json({ error: 'This custom domain is already in use.' }, { status: 409 });
    }
  }

  const subdomain = await generateUniqueSubdomain(storeName);

  const smtpSettings = smtpEnabled
    ? {
        smtp_enabled: true,
        smtp_host: String(body.smtpHost || '').trim() || null,
        smtp_port: Number(body.smtpPort || 587),
        smtp_user: String(body.smtpUser || '').trim() || null,
        smtp_password: String(body.smtpPassword || '').trim() || null,
        smtp_from_email: String(body.smtpFromEmail || '').trim() || null,
        smtp_from_name: String(body.smtpFromName || '').trim() || storeName,
      }
    : {
        smtp_enabled: false,
        smtp_host: null,
        smtp_port: null,
        smtp_user: null,
        smtp_password: null,
        smtp_from_email: null,
        smtp_from_name: null,
      };

  const { data: merchant, error } = await supabaseAdmin
    .from('merchants')
    .insert({
      user_id: user.id,
      store_name: storeName,
      subdomain,
      custom_domain: customDomain || null,
      domain_verified: false,
      store_email: storeEmail,
      store_industry: industry,
      currency,
      locale,
      ai_responses_enabled: true,
      conversation_logging_enabled: true,
      ai_tone: aiTone,
      ai_custom_instructions: aiInstructions,
      mcp_api_key: generateMcpApiKey(),
      mcp_client_id: generateMcpClientId(),
      mcp_client_secret: generateMcpClientSecret(),
      branding_settings: {
        primary_color: primaryColor,
        chat_background_color: '#f6f6f7',
        user_bubble_color: primaryColor,
        bot_bubble_color: '#ffffff',
        welcome_message: `Welcome to ${storeName}! How can I help you today?`,
        show_best_sellers: true,
        show_categories: true,
        enable_chat: true,
        product_display_mode: 'grid',
      },
      ...smtpSettings,
    })
    .select('id, store_name, subdomain, custom_domain')
    .single();

  if (error || !merchant) {
    return NextResponse.json({ error: error?.message || 'Failed to create merchant.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, merchant });
}
