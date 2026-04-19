import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WooProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; name: string; alt: string }>;
  attributes: Array<{ id: number; name: string; options: string[] }>;
  variations: number[];
}

interface WooVariation {
  id: number;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: string;
  attributes: Array<{ id: number; name: string; option: string }>;
  image?: { id: number; src: string };
}

function assertSafeWooStoreUrl(storeUrl: string) {
  const url = new URL(storeUrl);
  if (url.protocol !== 'https:') {
    throw new Error('WooCommerce store URL must use HTTPS.');
  }

  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
  ) {
    throw new Error('WooCommerce store URL is not allowed.');
  }

  return url;
}

function buildWooRequest(storeUrl: string, endpoint: string, consumerKey: string, consumerSecret: string, params: Record<string, string> = {}) {
  const cleanUrl = storeUrl.replace(/\/$/, '');
  const url = new URL(`${cleanUrl}/wp-json/wc/v3/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  return {
    url: url.toString(),
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
  };
}

async function fetchWooProducts(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  page: number = 1,
  perPage: number = 50
): Promise<{ products: WooProduct[]; totalPages: number; total: number }> {
  const request = buildWooRequest(storeUrl, 'products', consumerKey, consumerSecret, {
    per_page: String(perPage),
    page: String(page),
    status: 'publish'
  });

  const response = await fetch(request.url, { headers: request.headers });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API credentials. Please check your Consumer Key and Secret.');
    }
    if (response.status === 404) {
      throw new Error('WooCommerce REST API not found. Ensure WooCommerce is installed and permalinks are enabled.');
    }
    const errorText = await response.text();
    throw new Error(`WooCommerce API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const products = await response.json();
  const totalPages = parseInt(response.headers.get('x-wp-totalpages') || '1');
  const total = parseInt(response.headers.get('x-wp-total') || '0');

  return { products, totalPages, total };
}

async function fetchWooVariations(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  productId: number
): Promise<WooVariation[]> {
  const request = buildWooRequest(storeUrl, `products/${productId}/variations`, consumerKey, consumerSecret, {
    per_page: '100'
  });

  const response = await fetch(request.url, { headers: request.headers });

  if (!response.ok) return [];
  return response.json();
}

async function fetchWooProductCount(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<number> {
  const request = buildWooRequest(storeUrl, 'products', consumerKey, consumerSecret, {
    per_page: '1',
    status: 'publish'
  });

  const response = await fetch(request.url, { headers: request.headers });

  if (!response.ok) throw new Error('Failed to connect to WooCommerce');
  return parseInt(response.headers.get('x-wp-total') || '0');
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { merchantId, storeUrl, consumerKey, consumerSecret, action, productsData } = await request.json();

    if (!merchantId || !storeUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const access = await getMerchantAccess(user.id, merchantId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({ error: 'Consumer Key and Consumer Secret are required' }, { status: 400 });
    }

    const cleanStoreUrl = storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`;
    assertSafeWooStoreUrl(cleanStoreUrl);

    if (action === 'connect') {
      const count = await fetchWooProductCount(cleanStoreUrl, consumerKey, consumerSecret);

      await supabase
        .from('merchants')
        .update({
          woocommerce_config: {
            store_url: cleanStoreUrl,
            connected_at: new Date().toISOString()
          }
        })
        .eq('id', merchantId);

      return NextResponse.json({ success: true, productCount: count });
    }

    if (action === 'fetch_products') {
      let allProducts: WooProduct[] = [];
      const categoriesMap = new Map<string, number>();
      let page = 1;
      let totalPages = 1;

      do {
        const result = await fetchWooProducts(cleanStoreUrl, consumerKey, consumerSecret, page, 50);
        allProducts = [...allProducts, ...result.products];
        totalPages = result.totalPages;
        page++;
        if (page <= totalPages) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } while (page <= totalPages && allProducts.length < 500);

      const formattedProducts = allProducts.map(p => {
        const categoryName = p.categories?.[0]?.name || 'Uncategorized';
        categoriesMap.set(categoryName, (categoriesMap.get(categoryName) || 0) + 1);

        return {
          id: p.id,
          title: p.name,
          handle: p.slug,
          description: (p.short_description || p.description || '').replace(/<[^>]*>/g, '').substring(0, 200),
          product_type: categoryName,
          vendor: '',
          image: p.images?.[0]?.src || null,
          images: p.images?.map(img => img.src) || [],
          price: parseFloat(p.price || p.regular_price || '0'),
          compare_at_price: p.sale_price && p.regular_price ? parseFloat(p.regular_price) : null,
          variants_count: p.variations?.length || 1,
          sku: p.sku,
          stock_quantity: p.stock_quantity,
          categories: p.categories?.map(c => c.name) || [],
          tags: p.tags?.map(t => t.name) || [],
          type: p.type,
          variations: p.variations || [],
          attributes: p.attributes || []
        };
      });

      const categories = Array.from(categoriesMap.entries()).map(([name, count]) => ({ name, count }));

      return NextResponse.json({
        success: true,
        products: formattedProducts,
        categories,
        totalProducts: formattedProducts.length
      });
    }

    if (action === 'import') {
      if (!productsData || !Array.isArray(productsData) || productsData.length === 0) {
        return NextResponse.json({ error: 'No products selected for import' }, { status: 400 });
      }

      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      const sendUpdate = async (data: any) => {
        await writer.write(encoder.encode(JSON.stringify(data) + '\n'));
      };

      (async () => {
        try {
          await sendUpdate({
            status: 'importing',
            message: `Starting import of ${productsData.length} products...`,
            total: productsData.length,
            imported: 0,
            failed: 0
          });

          let imported = 0;
          let failed = 0;
          const errors: string[] = [];

          for (const product of productsData) {
            try {
              let categoryId = null;
              const categoryName = product.product_type || product.categories?.[0];

              if (categoryName && categoryName !== 'Uncategorized') {
                const { data: existingCat } = await supabase
                  .from('categories')
                  .select('id')
                  .eq('merchant_id', merchantId)
                  .eq('name', categoryName)
                  .single();

                if (existingCat) {
                  categoryId = existingCat.id;
                } else {
                  const slug = categoryName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                  const { data: newCat } = await supabase
                    .from('categories')
                    .insert({
                      merchant_id: merchantId,
                      name: categoryName,
                      slug
                    })
                    .select('id')
                    .single();
                  if (newCat) categoryId = newCat.id;
                }
              }

              let description = product.description || '';
              if (description.length > 2000) {
                description = description.substring(0, 2000) + '...';
              }

              const productData = {
                merchant_id: merchantId,
                name: product.title,
                description: description || null,
                price: product.price || 0,
                sku: product.sku || null,
                stock_quantity: product.stock_quantity ?? null,
                category_id: categoryId,
                image_url: product.image || null,
                badge: product.tags?.[0] || null,
                meta_title: product.title,
                meta_description: description?.substring(0, 160) || null,
                woocommerce_id: String(product.id)
              };

              const { data: insertedProduct, error: productError } = await supabase
                .from('products')
                .insert(productData)
                .select('id')
                .single();

              if (productError) {
                throw new Error(`Product "${product.title}": ${productError.message}`);
              }

              if (product.type === 'variable' && product.variations?.length > 0 && insertedProduct) {
                try {
                  const variations = await fetchWooVariations(
                    cleanStoreUrl, consumerKey, consumerSecret, product.id
                  );

                  if (variations.length > 0) {
                    const variantsData = variations.map(v => {
                      const options: Record<string, string> = {};
                      v.attributes?.forEach(attr => {
                        options[attr.name.toLowerCase()] = attr.option;
                      });

                      return {
                        product_id: insertedProduct.id,
                        name: v.attributes?.map(a => a.option).join(' / ') || product.title,
                        sku: v.sku || null,
                        price: parseFloat(v.price || v.regular_price || '0'),
                        stock_quantity: v.stock_quantity ?? null,
                        options,
                        woocommerce_variant_id: String(v.id)
                      };
                    });

                    await supabase.from('product_variants').insert(variantsData);
                  }
                } catch (varErr) {
                  logger.error('Variants fetch error:', varErr);
                }
              }

              imported++;

              if (imported % 3 === 0 || imported === productsData.length) {
                await sendUpdate({
                  status: 'importing',
                  message: `Imported ${imported} of ${productsData.length} products...`,
                  total: productsData.length,
                  imported,
                  failed
                });
              }

            } catch (err: any) {
              failed++;
              errors.push(err.message);
              logger.error('Import error for product:', product.title, err);
            }
          }

          await sendUpdate({
            status: 'completed',
            message: `Import complete! ${imported} products imported${failed > 0 ? `, ${failed} failed` : ''}.`,
            total: productsData.length,
            imported,
            failed,
            errors: errors.slice(0, 10)
          });

        } catch (err: any) {
          await sendUpdate({
            status: 'error',
            message: err.message || 'Import failed',
            errors: [err.message]
          });
        } finally {
          await writer.close();
        }
      })();

      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked'
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    logger.error('WooCommerce import error:', err);
    return NextResponse.json(
      { error: err.message || 'Import failed' },
      { status: 500 }
    );
  }
}
