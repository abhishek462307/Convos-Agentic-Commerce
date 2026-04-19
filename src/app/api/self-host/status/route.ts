import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

function hasValue(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request, 'settings');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { data: merchant, error } = await supabaseAdmin
    .from('merchants')
    .select('id, subdomain, custom_domain, mcp_api_key, payment_methods, smtp_enabled')
    .eq('id', result.context.merchantId)
    .single();

  if (error || !merchant) {
    return NextResponse.json({ error: error?.message || 'Merchant not found' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const isHttps = appUrl.startsWith('https://');
  const stripeConfigured = hasValue(process.env.STRIPE_SECRET_KEY) && hasValue(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const openAiConfigured = hasValue(process.env.OPENAI_API_KEY);
  const anthropicConfigured = hasValue(process.env.ANTHROPIC_API_KEY);
  const azureConfigured = hasValue(process.env.AZURE_OPENAI_API_KEY) && hasValue(process.env.AZURE_OPENAI_ENDPOINT) && hasValue(process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
  const aiConfigured = openAiConfigured || anthropicConfigured || azureConfigured;
  const supabaseConfigured = hasValue(process.env.NEXT_PUBLIC_SUPABASE_URL) && hasValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const smtpConfigured = merchant.smtp_enabled || (hasValue(process.env.PLATFORM_SMTP_HOST) && hasValue(process.env.PLATFORM_SMTP_USER) && hasValue(process.env.PLATFORM_SMTP_FROM_EMAIL));
  const mcpConfigured = hasValue(merchant.mcp_api_key);
  const migrationProtected = hasValue(process.env.MIGRATION_SECRET);
  const paymentMethods = (merchant.payment_methods || {}) as Record<string, unknown>;
  const merchantPaymentsConfigured = Object.values(paymentMethods).some(Boolean);

  return NextResponse.json({
    appUrl,
    merchant: {
      subdomain: merchant.subdomain,
      customDomain: merchant.custom_domain,
    },
    checks: {
      appUrl: { ok: hasValue(appUrl), detail: hasValue(appUrl) ? appUrl : 'Set NEXT_PUBLIC_APP_URL' },
      https: { ok: isHttps, detail: isHttps ? 'HTTPS enabled' : 'Use HTTPS in production' },
      supabase: { ok: supabaseConfigured, detail: supabaseConfigured ? 'Supabase env configured' : 'Missing Supabase env values' },
      stripe: { ok: stripeConfigured, detail: stripeConfigured ? 'Stripe keys configured' : 'Optional until payments go live' },
      ai: {
        ok: aiConfigured,
        detail: openAiConfigured
          ? 'OpenAI configured'
          : anthropicConfigured
            ? 'Anthropic configured'
            : azureConfigured
              ? 'Azure OpenAI configured'
              : 'Add OpenAI, Anthropic, or Azure OpenAI credentials to enable AI routes',
      },
      smtp: { ok: smtpConfigured, detail: smtpConfigured ? 'SMTP ready' : 'Optional unless you send email flows' },
      mcp: { ok: mcpConfigured, detail: mcpConfigured ? 'MCP auth ready' : 'Generate merchant MCP key in settings' },
      payments: { ok: merchantPaymentsConfigured || stripeConfigured, detail: merchantPaymentsConfigured ? 'Merchant payment methods configured' : 'Configure payment methods before accepting live checkout' },
      migrationSecret: { ok: migrationProtected, detail: migrationProtected ? 'Migration endpoints protected' : 'Recommended for protected migration routes' },
    },
  });
}
