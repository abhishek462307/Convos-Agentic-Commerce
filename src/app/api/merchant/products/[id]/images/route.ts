import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function getOwnedProductId(merchantId: string, productId: string) {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('merchant_id', merchantId)
    .maybeSingle();
  return data?.id || null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id } = await context.params;
  const ownedProductId = await getOwnedProductId(result.context.merchantId, id);
  if (!ownedProductId) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const body = await request.json();
  if (!body?.url) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('product_images')
    .select('id')
    .eq('product_id', id);

  const { data, error } = await supabaseAdmin
    .from('product_images')
    .insert({
      product_id: id,
      url: body.url,
      alt_text: body.alt_text || '',
      position: existing?.length || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, image: data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id } = await context.params;
  const ownedProductId = await getOwnedProductId(result.context.merchantId, id);
  if (!ownedProductId) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get('imageId');
  if (!imageId) {
    return NextResponse.json({ error: 'Image id is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
