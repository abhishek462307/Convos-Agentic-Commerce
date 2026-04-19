import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PATCH(request: Request) {
  const result = await resolveMerchantContext(request, 'settings');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json();
  if (!body?.store_name?.trim() || !body?.store_email?.trim()) {
    return NextResponse.json({ error: 'Store name and email are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .update({
      store_name: body.store_name.trim(),
      store_email: body.store_email.trim(),
      store_industry: body.store_industry?.trim() || null,
      currency: body.currency || 'USD',
      locale: body.locale || 'en-US',
    })
    .eq('id', result.context.merchantId)
    .select('id, store_name, store_email, store_industry, currency, locale')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, merchant: data });
}
