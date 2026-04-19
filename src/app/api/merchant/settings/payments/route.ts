import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

function redactPaymentMethods(paymentMethods: Record<string, any>) {
  const safe = JSON.parse(JSON.stringify(paymentMethods || {}));
  if (safe.stripe && typeof safe.stripe === 'object') {
    delete safe.stripe.secret_key;
    delete safe.stripe.test_secret_key;
    delete safe.stripe.webhook_secret;
    delete safe.stripe.test_webhook_secret;
  }
  return safe;
}

export async function PATCH(request: Request) {
  const result = await resolveMerchantContext(request, 'settings');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json();
  const paymentMethods = body?.payment_methods;
  if (!paymentMethods || typeof paymentMethods !== 'object') {
    return NextResponse.json({ error: 'payment_methods is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .update({ payment_methods: paymentMethods })
    .eq('id', result.context.merchantId)
    .select('id, payment_methods')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    merchant: data ? { ...data, payment_methods: redactPaymentMethods(data.payment_methods || {}) } : data
  });
}
