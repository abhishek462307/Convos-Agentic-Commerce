import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { action, productIds, updateData } = await request.json();
  if (!action || !Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json({ error: 'Invalid request: action and productIds required' }, { status: 400 });
  }

  const merchantId = result.context.merchantId;

  switch (action) {
    case 'delete': {
      const { data: ownedProducts } = await supabaseAdmin
        .from('products')
        .select('id')
        .in('id', productIds)
        .eq('merchant_id', merchantId);

      const ownedIds = (ownedProducts || []).map((product: { id: string }) => product.id);
      if (ownedIds.length === 0) {
        return NextResponse.json({ error: 'No valid products found for this merchant' }, { status: 400 });
      }

      await supabaseAdmin.from('product_collections').delete().in('product_id', ownedIds);
      await supabaseAdmin.from('product_variants').delete().in('product_id', ownedIds);

      const { error } = await supabaseAdmin
        .from('products')
        .delete()
        .in('id', ownedIds)
        .eq('merchant_id', merchantId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Deleted ${ownedIds.length} products`, deletedCount: ownedIds.length });
    }

    case 'update_stock': {
      if (typeof updateData?.stock_quantity !== 'number') {
        return NextResponse.json({ error: 'stock_quantity required for update_stock action' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('products')
        .update({ stock_quantity: updateData.stock_quantity })
        .in('id', productIds)
        .eq('merchant_id', merchantId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Updated stock for ${productIds.length} products`, updatedCount: productIds.length });
    }

    case 'update_category': {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ category_id: updateData?.category_id || null })
        .in('id', productIds)
        .eq('merchant_id', merchantId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Updated category for ${productIds.length} products`, updatedCount: productIds.length });
    }

    case 'add_to_collection': {
      if (!updateData?.collection_id) {
        return NextResponse.json({ error: 'collection_id required for add_to_collection action' }, { status: 400 });
      }

      const insertData = productIds.map((productId: string) => ({
        product_id: productId,
        collection_id: updateData.collection_id,
      }));

      const { error } = await supabaseAdmin
        .from('product_collections')
        .upsert(insertData, { onConflict: 'product_id,collection_id', ignoreDuplicates: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Added ${productIds.length} products to collection`, updatedCount: productIds.length });
    }

    case 'remove_from_collection': {
      if (!updateData?.collection_id) {
        return NextResponse.json({ error: 'collection_id required for remove_from_collection action' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('product_collections')
        .delete()
        .in('product_id', productIds)
        .eq('collection_id', updateData.collection_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Removed ${productIds.length} products from collection`, updatedCount: productIds.length });
    }

    case 'update_badge': {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ badge: updateData?.badge || null })
        .in('id', productIds)
        .eq('merchant_id', merchantId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Updated badge for ${productIds.length} products`, updatedCount: productIds.length });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
