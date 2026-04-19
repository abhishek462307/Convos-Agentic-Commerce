import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id } = await context.params;
  const [{ data: product, error: productError }, { data: variants }, { data: images }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('merchant_id', result.context.merchantId)
      .single(),
    supabaseAdmin
      .from('product_variants')
      .select('*')
      .eq('product_id', id)
      .order('created_at'),
    supabaseAdmin
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('position'),
    supabaseAdmin
      .from('categories')
      .select('*')
      .eq('merchant_id', result.context.merchantId),
  ]);

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 404 });
  }

  return NextResponse.json({
    product,
    variants: variants || [],
    images: images || [],
    categories: categories || [],
  });
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
  const body = await request.json();
  const product = body?.product;
  if (!product?.name?.trim()) {
    return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
  }

  const categoryName = product.category_id
    ? (await supabaseAdmin
        .from('categories')
        .select('name')
        .eq('id', product.category_id)
        .eq('merchant_id', result.context.merchantId)
        .maybeSingle()).data?.name || null
    : null;

  const { data, error } = await supabaseAdmin
    .from('products')
    .update({
      name: product.name,
      description: product.description || null,
      price: product.price,
      badge: product.badge || null,
      image_url: product.image_url || null,
      category_id: product.category_id || null,
      category: categoryName,
      stock_quantity: product.stock_quantity,
      sku: product.sku || null,
      compare_at_price: product.compare_at_price || null,
      meta_title: product.meta_title || null,
      meta_description: product.meta_description || null,
      bargain_enabled: product.bargain_enabled || false,
      bargain_min_price: product.bargain_min_price || null,
      type: product.type,
      track_quantity: product.track_quantity,
      digital_file_url: product.digital_file_url || null,
      status: product.status,
      weight: product.weight || null,
      weight_unit: product.weight_unit || 'kg',
      length: product.length || null,
      width: product.width || null,
      height: product.height || null,
      dimension_unit: product.dimension_unit || 'cm',
      requires_shipping: product.requires_shipping ?? true,
    })
    .eq('id', id)
    .eq('merchant_id', result.context.merchantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, product: data });
}
