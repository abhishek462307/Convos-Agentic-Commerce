import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createMerchantDiscount, deactivateMerchantDiscount } from '@/lib/domain/discounts';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { data, error } = await supabaseAdmin
    .from('discounts')
    .select('*')
    .eq('merchant_id', result.context.merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json();
  if (!body?.code || Number(body?.value) <= 0) {
    return NextResponse.json({ error: 'Please enter a valid code and value' }, { status: 400 });
  }

  try {
    const data = await createMerchantDiscount({
      merchantId: result.context.merchantId,
      actorType: 'user',
      code: String(body.code),
      type: body.type,
      value: Number(body.value),
      minOrderAmount: Number(body.min_order_amount || 0),
      usageLimit: body.usage_limit ?? null,
      endsAt: body.ends_at || null,
    });

    return NextResponse.json({ success: true, discount: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Discount id is required' }, { status: 400 });
  }

  try {
    await deactivateMerchantDiscount(
      result.context.merchantId,
      id,
      'user'
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
