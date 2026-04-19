import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantCategories } from '@/lib/merchant-panel';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const categories = await getMerchantCategories(result.context.merchantId);
  return NextResponse.json({ items: categories });
}

export async function POST(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json();
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
  }

  const slug = body.slug || body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert([{
      name: body.name,
      slug,
      image_url: body.image_url || null,
      merchant_id: result.context.merchantId,
    }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, category: data });
}

export async function PATCH(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json();
  if (!body?.id || !body?.name?.trim()) {
    return NextResponse.json({ error: 'Category id and name are required' }, { status: 400 });
  }

  const slug = body.slug || body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  const { data, error } = await supabaseAdmin
    .from('categories')
    .update({
      name: body.name,
      slug,
      image_url: body.image_url || null,
    })
    .eq('id', body.id)
    .eq('merchant_id', result.context.merchantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, category: data });
}

export async function DELETE(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Category id is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('merchant_id', result.context.merchantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
