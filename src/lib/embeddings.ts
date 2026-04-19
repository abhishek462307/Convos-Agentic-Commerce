import logger from '@/lib/logger';
import { embed, embedMany } from 'ai';

import { getStorefrontEmbeddingModel } from '@/lib/ai/storefront';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PRODUCT_SELECT } from '@/lib/product-select';

function buildProductText(product: {
  name: string;
  description?: string;
  category?: string;
  price?: number;
}): string {
  const parts = [product.name];
  if (product.category) parts.push(product.category);
  if (product.description) parts.push(product.description.replace(/\n/g, ' ').slice(0, 500));
  if (product.price) parts.push(`$${product.price}`);
  return parts.join(' | ');
}

let embeddingAvailable: boolean | null = null;

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (embeddingAvailable === false) return null;

  try {
    const result = await embed({
      model: getStorefrontEmbeddingModel(),
      value: text.replace(/\n/g, ' '),
    });
    if (result.embedding) embeddingAvailable = true;
    return result.embedding || null;
  } catch {
    embeddingAvailable = false;
    return null;
  }
}

export async function generateBatchEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  try {
    const result = await embedMany({
      model: getStorefrontEmbeddingModel(),
      values: texts.map((t) => t.replace(/\n/g, ' ')),
    });
    return result.embeddings;
  } catch (error) {
    logger.error('Batch embedding generation failed:', error);
    return texts.map(() => null);
  }
}

export async function updateProductEmbedding(productId: string, product: {
  name: string;
  description?: string;
  category?: string;
  price?: number;
}): Promise<boolean> {
  const text = buildProductText(product);

  const searchText = [product.name, product.category, product.description]
    .filter(Boolean)
    .join(' ');

  await supabaseAdmin.rpc('exec_sql', {
    sql_query: `UPDATE products SET search_text = to_tsvector('english', '${searchText.replace(/'/g, "''")}') WHERE id = '${productId}'`
  });

  const embedding = await generateEmbedding(text);
  if (embedding) {
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `UPDATE products SET embedding = '[${embedding.join(',')}]'::vector WHERE id = '${productId}'`
    });
    if (error) {
      logger.error('Failed to save embedding:', error);
      return false;
    }
    return true;
  }

  return false;
}

export async function backfillAllEmbeddings(merchantId?: string): Promise<{ updated: number; failed: number; skipped: number }> {
  let query = supabaseAdmin
    .from('products')
    .select('id, name, description, category, price')
    .is('search_text', null);

  if (merchantId) query = query.eq('merchant_id', merchantId);

  const { data: products } = await query.limit(500);
  if (!products || products.length === 0) return { updated: 0, failed: 0, skipped: 0 };

  let updated = 0;
  let failed = 0;

  for (const product of products) {
    const searchText = [product.name, product.category, product.description]
      .filter(Boolean)
      .join(' ');

    await supabaseAdmin.rpc('exec_sql', {
      sql_query: `UPDATE products SET search_text = to_tsvector('english', '${searchText.replace(/'/g, "''")}') WHERE id = '${product.id}'`
    });
    updated++;
  }

  const BATCH_SIZE = 20;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const texts = batch.map(p => buildProductText(p));
    const embeddings = await generateBatchEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      if (embeddings[j]) {
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: `UPDATE products SET embedding = '[${embeddings[j]!.join(',')}]'::vector WHERE id = '${batch[j].id}'`
        });
        if (error) failed++;
      }
    }
  }

  return { updated, failed, skipped: 0 };
}

export async function fullTextSearch(
  query: string,
  merchantId: string,
  options?: { category?: string; minPrice?: number; maxPrice?: number; inStockOnly?: boolean; limit?: number; dealsOnly?: boolean; bargainOnly?: boolean; productIds?: string[] }
): Promise<any[]> {
  const tsQuery = query.trim().split(/\s+/).filter(w => w.length >= 2).map(w => `${w}:*`).join(' & ');

  if (!tsQuery) {
    let fallbackQuery = supabaseAdmin.from('products').select(PRODUCT_SELECT).eq('merchant_id', merchantId);
    if (options?.category) fallbackQuery = fallbackQuery.ilike('category', `%${options.category}%`);
    if (options?.minPrice !== undefined && options?.minPrice !== null) fallbackQuery = fallbackQuery.gte('price', options.minPrice);
    if (options?.maxPrice !== undefined && options?.maxPrice !== null) fallbackQuery = fallbackQuery.lte('price', options.maxPrice);
    if (options?.inStockOnly) fallbackQuery = fallbackQuery.gt('stock_quantity', 0);
    if (options?.dealsOnly) fallbackQuery = fallbackQuery.not('compare_at_price', 'is', null);
    if (options?.bargainOnly) fallbackQuery = fallbackQuery.eq('bargain_enabled', true);
    if (options?.productIds && options.productIds.length > 0) fallbackQuery = fallbackQuery.in('id', options.productIds);
    const { data } = await fallbackQuery.limit(options?.limit || 20);
    return data || [];
  }

  let whereClauses = [`merchant_id = '${merchantId}'`, `search_text @@ to_tsquery('english', '${tsQuery.replace(/'/g, "''")}')`];
  if (options?.category) whereClauses.push(`category ILIKE '%${options.category.replace(/'/g, "''")}%'`);
  if (options?.minPrice !== undefined && options?.minPrice !== null) whereClauses.push(`price >= ${options.minPrice}`);
  if (options?.maxPrice !== undefined && options?.maxPrice !== null) whereClauses.push(`price <= ${options.maxPrice}`);
  if (options?.inStockOnly) whereClauses.push(`stock_quantity > 0`);
  if (options?.dealsOnly) whereClauses.push(`compare_at_price IS NOT NULL AND compare_at_price > price`);
  if (options?.bargainOnly) whereClauses.push(`bargain_enabled = true`);
  if (options?.productIds && options.productIds.length > 0) {
    const idList = options.productIds.map(id => `'${id}'`).join(',');
    whereClauses.push(`id IN (${idList})`);
  }

  const { data } = await supabaseAdmin.rpc('exec_sql', {
    sql_query: `SELECT id, name, description, price, compare_at_price, category, image_url, stock_quantity, bargain_enabled, bargain_min_price, ts_rank(search_text, to_tsquery('english', '${tsQuery.replace(/'/g, "''")}')) as rank FROM products WHERE ${whereClauses.join(' AND ')} ORDER BY rank DESC LIMIT ${options?.limit || 20}`
  });

  if (data && Array.isArray(data) && data.length > 0) {
    return data;
  }

  // Fallback to iLike if TSQuery yields nothing
  let ilikeFallback = supabaseAdmin.from('products').select(PRODUCT_SELECT).eq('merchant_id', merchantId);
  const words = query.trim().split(/\s+/).filter(w => w.length >= 2);
  if (words.length > 0) {
    const conditions = words.flatMap(w => [`name.ilike.%${w}%`, `description.ilike.%${w}%`, `category.ilike.%${w}%`]);
    ilikeFallback = ilikeFallback.or(conditions.join(','));
  }
  if (options?.category) ilikeFallback = ilikeFallback.ilike('category', `%${options.category}%`);
  if (options?.minPrice !== undefined && options?.minPrice !== null) ilikeFallback = ilikeFallback.gte('price', options.minPrice);
  if (options?.maxPrice !== undefined && options?.maxPrice !== null) ilikeFallback = ilikeFallback.lte('price', options.maxPrice);
  if (options?.inStockOnly) ilikeFallback = ilikeFallback.gt('stock_quantity', 0);
  if (options?.dealsOnly) ilikeFallback = ilikeFallback.not('compare_at_price', 'is', null);
  if (options?.bargainOnly) ilikeFallback = ilikeFallback.eq('bargain_enabled', true);
  if (options?.productIds && options.productIds.length > 0) ilikeFallback = ilikeFallback.in('id', options.productIds);
  
  const { data: fallback } = await ilikeFallback.limit(options?.limit || 20);
  return fallback || [];
}

export async function semanticSearch(
  query: string,
  merchantId: string,
  options?: { category?: string; minPrice?: number; maxPrice?: number; inStockOnly?: boolean; limit?: number; dealsOnly?: boolean; bargainOnly?: boolean; productIds?: string[] }
): Promise<any[]> {
  const limit = options?.limit || 20;
  const mergedResults = new Map<string, any>();
  const embedding = await generateEmbedding(query);

  if (embedding) {
    const { data } = await supabaseAdmin.rpc('match_products', {
      query_embedding: `[${embedding.join(',')}]`,
      match_merchant_id: merchantId,
      match_threshold: 0.15, // Lowered threshold for better coverage
      match_count: 50 // Get fewer but highly relevant vector matches
    });

    if (data && data.length > 0) {
      let results = data;
      
      if (options?.category) {
        const catSearch = options.category.toLowerCase();
        results = results.filter((p: any) => 
          p.category?.toLowerCase().includes(catSearch) || 
          catSearch.includes(p.category?.toLowerCase() || '')
        );
      }
      
      if (options?.minPrice !== undefined && options?.minPrice !== null) {
        const minP = Number(options.minPrice);
        results = results.filter((p: any) => Number(p.price) >= minP);
      }
      
      if (options?.maxPrice !== undefined && options?.maxPrice !== null) {
        const maxP = Number(options.maxPrice);
        results = results.filter((p: any) => Number(p.price) <= maxP);
      }
      
      if (options?.inStockOnly) {
        results = results.filter((p: any) => p.stock_quantity > 0);
      }

      if (options?.dealsOnly) {
        results = results.filter((p: any) => p.compare_at_price && Number(p.compare_at_price) > Number(p.price));
      }

      if (options?.bargainOnly) {
        results = results.filter((p: any) => !!p.bargain_enabled);
      }

      if (options?.productIds && options.productIds.length > 0) {
        const idSet = new Set(options.productIds);
        results = results.filter((p: any) => idSet.has(p.id));
      }

      for (const product of results) {
        mergedResults.set(product.id, product);
      }
    }
  }

  // Lexical search now uses SQL filters, making it much more reliable for finding specific items across all products
  const lexicalResults = await fullTextSearch(query, merchantId, { ...options, limit });
  for (const product of lexicalResults) {
    if (!mergedResults.has(product.id)) {
      mergedResults.set(product.id, product);
    }
  }

  return Array.from(mergedResults.values()).slice(0, limit);
}
