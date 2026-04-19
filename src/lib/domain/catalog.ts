import { supabaseAdmin } from '@/lib/supabase-admin';
import { logDomainEvent } from '@/lib/agentic/events';

interface CreateMerchantProductInput {
  merchantId: string
  merchantName: string
  actorType: 'user' | 'agent'
  product: Record<string, any>
  selectedCollections?: string[]
  variants?: Array<Record<string, any>>
}

interface BatchCatalogAutomationInput {
  merchantId: string
  actorType: 'user' | 'agent' | 'system'
  productIds: string[]
  changes: Record<string, unknown>
  eventType: string
  summary: string
}

export async function createMerchantProduct(input: CreateMerchantProductInput) {
  const categoryName = input.product.category_id
    ? (await supabaseAdmin
        .from('categories')
        .select('name')
        .eq('id', input.product.category_id)
        .eq('merchant_id', input.merchantId)
        .maybeSingle()).data?.name || null
    : null;

  const { data: createdProduct, error } = await supabaseAdmin
    .from('products')
    .insert([{
      name: input.product.name,
      description: input.product.description || null,
      price: input.product.price,
      compare_at_price: input.product.compare_at_price ?? null,
      badge: input.product.badge || null,
      image_url: input.product.image_url || null,
      category_id: input.product.category_id || null,
      category: categoryName,
      merchant_id: input.merchantId,
      stock_quantity: input.product.stock_quantity,
      track_quantity: input.product.track_quantity,
      sku: input.product.sku || null,
      type: input.product.type,
      status: input.product.status,
      digital_file_url: input.product.digital_file_url || null,
      bargain_enabled: input.product.bargain_enabled,
      bargain_min_price: input.product.bargain_min_price ?? null,
    }])
    .select()
    .single();

  if (error || !createdProduct) {
    throw error || new Error('Failed to create product');
  }

  if (Array.isArray(input.selectedCollections) && input.selectedCollections.length > 0) {
    await supabaseAdmin.from('product_collections').insert(
      input.selectedCollections.map((collectionId) => ({
        product_id: createdProduct.id,
        collection_id: collectionId,
      }))
    );
  }

  if (Array.isArray(input.variants) && input.variants.length > 0) {
    await supabaseAdmin.from('product_variants').insert(
      input.variants.map((variant) => ({
        product_id: createdProduct.id,
        name: variant.name,
        sku: variant.sku || null,
        price: variant.price ?? null,
        stock_quantity: variant.stock_quantity ?? null,
        options: variant.options || {},
        is_active: true,
      }))
    );
  }

  await logDomainEvent({
    merchantId: input.merchantId,
    type: 'catalog_product_created',
    title: 'Product created',
    summary: `${input.merchantName} added ${createdProduct.name} to the catalog.`,
    actor: input.actorType,
    factors: {
      productId: createdProduct.id,
      status: createdProduct.status,
    },
  });

  return createdProduct;
}

export async function applyCatalogAutomation(input: BatchCatalogAutomationInput) {
  if (input.productIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .update({
      ...input.changes,
    })
    .eq('merchant_id', input.merchantId)
    .in('id', input.productIds)
    .select('id, name, badge, bargain_enabled, compare_at_price, status');

  if (error) {
    throw error;
  }

  await logDomainEvent({
    merchantId: input.merchantId,
    type: input.eventType,
    title: 'Catalog automation applied',
    summary: input.summary,
    actor: input.actorType,
    factors: {
      productIds: input.productIds,
      changes: input.changes,
    },
    outcome: {
      affectedCount: data?.length || 0,
    },
  });

  return data || [];
}
