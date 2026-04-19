import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { getMerchantCollections } from '@/lib/merchant-panel';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const collections = await getMerchantCollections(result.context.merchantId);
  return NextResponse.json({ items: collections });
}

export async function POST(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json();
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
  }

  const slug = body.slug || body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  const { data, error } = await supabaseAdmin
    .from('collections')
    .insert([{
      name: body.name,
      slug,
      description: body.description || null,
      image_url: body.image_url || null,
      merchant_id: result.context.merchantId,
    }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, collection: data });
}

export async function DELETE(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Collection id is required' }, { status: 400 });
  }

  await supabaseAdmin
    .from('product_collections')
    .delete()
    .eq('collection_id', id);

  const { error } = await supabaseAdmin
    .from('collections')
    .delete()
    .eq('id', id)
    .eq('merchant_id', result.context.merchantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
