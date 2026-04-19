import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantProducts } from '@/lib/merchant-panel';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createMerchantProduct } from '@/lib/domain/catalog';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const data = await getMerchantProducts(result.context.merchantId);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await resolveMerchantContext(request, 'products');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json();
  const product = body?.product;
  if (!product?.name?.trim()) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  }

  try {
    const createdProduct = await createMerchantProduct({
      merchantId: result.context.merchantId,
      merchantName: result.context.merchant.store_name,
      actorType: 'user',
      product,
      selectedCollections: Array.isArray(body?.selectedCollections) ? body.selectedCollections : [],
      variants: Array.isArray(body?.variants) ? body.variants : [],
    });

    return NextResponse.json({ success: true, product: createdProduct });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create product' },
      { status: 500 }
    );
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
    return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
  }

  await supabaseAdmin.from('product_collections').delete().eq('product_id', id);
  await supabaseAdmin.from('product_variants').delete().eq('product_id', id);

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id)
    .eq('merchant_id', result.context.merchantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
