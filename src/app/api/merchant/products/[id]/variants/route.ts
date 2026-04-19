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
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .insert({
      product_id: id,
      name: body?.name || 'New Variant',
      sku: body?.sku || '',
      price: body?.price ?? null,
      stock_quantity: body?.stock_quantity ?? null,
      options: body?.options || {},
      image_url: body?.image_url || '',
      is_active: body?.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, variant: data });
}

export async function PATCH(
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
  if (!body?.id) {
    return NextResponse.json({ error: 'Variant id is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .update({
      name: body.name,
      sku: body.sku,
      price: body.price,
      stock_quantity: body.stock_quantity,
      options: body.options,
      image_url: body.image_url,
      is_active: body.is_active,
    })
    .eq('id', body.id)
    .eq('product_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, variant: data });
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
  const variantId = searchParams.get('variantId');
  if (!variantId) {
    return NextResponse.json({ error: 'Variant id is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('product_variants')
    .delete()
    .eq('id', variantId)
    .eq('product_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
