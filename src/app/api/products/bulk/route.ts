import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, productIds, merchantId, updateData } = await request.json();

    if (!action || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request: action and productIds required' }, { status: 400 });
    }

    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID required' }, { status: 400 });
    }

    const access = await getMerchantAccess(user.id, merchantId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    switch (action) {
      case 'delete': {
        const { data: ownedProducts } = await supabase
          .from('products')
          .select('id')
          .in('id', productIds)
          .eq('merchant_id', merchantId);

        const ownedIds = (ownedProducts || []).map((p: { id: string }) => p.id);
        if (ownedIds.length === 0) {
          return NextResponse.json({ error: 'No valid products found for this merchant' }, { status: 400 });
        }

        await supabase.from('product_collections').delete().in('product_id', ownedIds);
        await supabase.from('product_variants').delete().in('product_id', ownedIds);

        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', ownedIds)
          .eq('merchant_id', merchantId);

        if (error) throw error;

        return NextResponse.json({ 
          success: true, 
          message: `Deleted ${ownedIds.length} products`,
          deletedCount: ownedIds.length
        });
      }

      case 'update_stock': {
        if (typeof updateData?.stock_quantity !== 'number') {
          return NextResponse.json({ error: 'stock_quantity required for update_stock action' }, { status: 400 });
        }

        const { error } = await supabase
          .from('products')
          .update({ stock_quantity: updateData.stock_quantity })
          .in('id', productIds)
          .eq('merchant_id', merchantId);

        if (error) throw error;

        return NextResponse.json({ 
          success: true, 
          message: `Updated stock for ${productIds.length} products`,
          updatedCount: productIds.length
        });
      }

      case 'update_category': {
        const { error } = await supabase
          .from('products')
          .update({ category_id: updateData?.category_id || null })
          .in('id', productIds)
          .eq('merchant_id', merchantId);

        if (error) throw error;

        return NextResponse.json({ 
          success: true, 
          message: `Updated category for ${productIds.length} products`,
          updatedCount: productIds.length
        });
      }

      case 'add_to_collection': {
        if (!updateData?.collection_id) {
          return NextResponse.json({ error: 'collection_id required for add_to_collection action' }, { status: 400 });
        }

        const insertData = productIds.map(productId => ({
          product_id: productId,
          collection_id: updateData.collection_id
        }));

        const { error } = await supabase
          .from('product_collections')
          .upsert(insertData, { onConflict: 'product_id,collection_id', ignoreDuplicates: true });

        if (error) throw error;

        return NextResponse.json({ 
          success: true, 
          message: `Added ${productIds.length} products to collection`,
          updatedCount: productIds.length
        });
      }

      case 'remove_from_collection': {
        if (!updateData?.collection_id) {
          return NextResponse.json({ error: 'collection_id required for remove_from_collection action' }, { status: 400 });
        }

        const { error } = await supabase
          .from('product_collections')
          .delete()
          .in('product_id', productIds)
          .eq('collection_id', updateData.collection_id);

        if (error) throw error;

        return NextResponse.json({ 
          success: true, 
          message: `Removed ${productIds.length} products from collection`,
          updatedCount: productIds.length
        });
      }

      case 'update_badge': {
        const { error } = await supabase
          .from('products')
          .update({ badge: updateData?.badge || null })
          .in('id', productIds)
          .eq('merchant_id', merchantId);

        if (error) throw error;

        return NextResponse.json({ 
          success: true, 
          message: `Updated badge for ${productIds.length} products`,
          updatedCount: productIds.length
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    logger.error('Bulk action error:', error);
    return NextResponse.json({ error: error.message || 'Bulk action failed' }, { status: 500 });
  }
}
