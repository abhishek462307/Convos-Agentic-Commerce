import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantShipmentsPage } from '@/lib/merchant-panel';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request, 'orders');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = await getMerchantShipmentsPage(result.context.merchantId, searchParams);
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load shipments' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const result = await resolveMerchantContext(request, 'orders');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const body = await request.json();
    if (!body?.labelId) {
      return NextResponse.json({ error: 'Label id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('shipping_labels')
      .update({ status: 'voided' })
      .eq('id', body.labelId)
      .eq('merchant_id', result.context.merchantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update shipment' },
      { status: 500 }
    );
  }
}
