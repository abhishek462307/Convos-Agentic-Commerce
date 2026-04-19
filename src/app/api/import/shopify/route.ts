import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SHOPIFY_API_VERSION = '2025-01';

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status?: string;
  images: Array<{ id: number; src: string; position: number }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string;
    inventory_quantity?: number;
    compare_at_price: string | null;
    option1: string | null;
    option2: string | null;
    option3: string | null;
  }>;
  options: Array<{ name: string; values: string[] }>;
  tags: string | string[];
}

async function fetchShopifyProductsPublic(
  storeUrl: string,
  page: number = 1
): Promise<{ products: ShopifyProduct[]; hasNextPage: boolean }> {
  const urlsToTry: string[] = [];
  
  if (storeUrl.includes('.myshopify.com')) {
    urlsToTry.push(`https://${storeUrl}/products.json?page=${page}&limit=50`);
  } else if (storeUrl.includes('.')) {
    urlsToTry.push(
      `https://${storeUrl}/products.json?page=${page}&limit=50`,
      `https://www.${storeUrl}/products.json?page=${page}&limit=50`
    );
  } else {
    urlsToTry.push(
      `https://${storeUrl}.myshopify.com/products.json?page=${page}&limit=50`,
      `https://${storeUrl}.com/products.json?page=${page}&limit=50`,
      `https://www.${storeUrl}.com/products.json?page=${page}&limit=50`
    );
  }

  let lastError = '';
  
  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProductImporter/1.0)',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];
        return { 
          products, 
          hasNextPage: products.length === 50 
        };
      }
      
      lastError = `${response.status}`;
    } catch (err: any) {
      lastError = err.message;
    }
  }

  throw new Error(`Store not found or not accessible. Please verify your store URL. (${lastError})`);
}

async function fetchShopifyProducts(
  storeUrl: string, 
  accessToken: string,
  pageInfo?: string
): Promise<{ products: ShopifyProduct[]; nextPageInfo: string | null }> {
  const shopifyDomain = storeUrl.includes('.myshopify.com') 
    ? storeUrl 
    : `${storeUrl}.myshopify.com`;
  const baseUrl = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json`;
  
  let url = `${baseUrl}?limit=50`;
  if (pageInfo) {
    url = `${baseUrl}?limit=50&page_info=${pageInfo}`;
  }

  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('Invalid access token. Please check your Shopify credentials.');
    }
    if (response.status === 404) {
      throw new Error('Store not found. Please verify your store URL.');
    }
    throw new Error(errorData.errors || `Shopify API error: ${response.status}`);
  }

  const data = await response.json();
  
  const linkHeader = response.headers.get('link');
  let nextPageInfo: string | null = null;
  
  if (linkHeader) {
    const nextMatch = linkHeader.match(/page_info=([^>&]+).*?rel="next"/);
    if (nextMatch) {
      nextPageInfo = nextMatch[1];
    }
  }

  return { products: data.products || [], nextPageInfo };
}

async function getProductCount(storeUrl: string, accessToken: string): Promise<number> {
  const shopifyDomain = storeUrl.includes('.myshopify.com') 
    ? storeUrl 
    : `${storeUrl}.myshopify.com`;
  const response = await fetch(
    `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/products/count.json`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get product count');
  }

  const data = await response.json();
  return data.count || 0;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { merchantId, shopifyStore, accessToken, action, method = 'api', productsData } = await request.json();

    if (!merchantId || !shopifyStore) {
      return NextResponse.json(
        { error: 'Missing required fields: merchantId and shopifyStore' },
        { status: 400 }
      );
    }

    const access = await getMerchantAccess(user.id, merchantId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    if (method === 'api' && !accessToken) {
      return NextResponse.json(
        { error: 'Access token is required for API method' },
        { status: 400 }
      );
    }

      if (action === 'connect') {
        if (method === 'api') {
          const productCount = await getProductCount(shopifyStore, accessToken);
          return NextResponse.json({ success: true, productCount });
        } else {
          const { products, hasNextPage } = await fetchShopifyProductsPublic(shopifyStore, 1);
          return NextResponse.json({ 
            success: true, 
            productCount: products.length,
            hasMore: hasNextPage
          });
        }
      }

      if (action === 'fetch_products') {
        let allProducts: ShopifyProduct[] = [];
        const categoriesSet = new Set<string>();
        
        if (method === 'api') {
          let pageInfo: string | null = null;
          do {
            const { products, nextPageInfo } = await fetchShopifyProducts(
              shopifyStore,
              accessToken,
              pageInfo || undefined
            );
            allProducts = [...allProducts, ...products];
            pageInfo = nextPageInfo;
            if (pageInfo) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } while (pageInfo && allProducts.length < 500);
        } else {
          let page = 1;
          let hasNextPage = true;
          do {
            const { products, hasNextPage: next } = await fetchShopifyProductsPublic(
              shopifyStore,
              page
            );
            allProducts = [...allProducts, ...products];
            hasNextPage = next;
            page++;
            if (hasNextPage) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } while (hasNextPage && page <= 10);
        }

        const formattedProducts = allProducts.map(p => {
          if (p.product_type) {
            categoriesSet.add(p.product_type);
          }
          return {
            id: p.id,
            title: p.title,
            handle: p.handle,
            description: (p.body_html || '').replace(/<[^>]*>/g, '').substring(0, 200),
            product_type: p.product_type || 'Uncategorized',
            vendor: p.vendor,
            image: p.images[0]?.src || null,
            images: p.images.map(img => img.src),
            price: parseFloat(p.variants[0]?.price || '0'),
            compare_at_price: p.variants[0]?.compare_at_price ? parseFloat(p.variants[0].compare_at_price) : null,
            variants_count: p.variants.length,
            variants: p.variants.map(v => ({
              id: v.id,
              title: v.title,
              price: parseFloat(v.price),
              sku: v.sku,
              inventory_quantity: v.inventory_quantity
            })),
            options: p.options,
            tags: Array.isArray(p.tags) ? p.tags : (p.tags?.split(',').map((t: string) => t.trim()) || [])
          };
        });

        const categories = Array.from(categoriesSet).map(name => ({
          name,
          count: formattedProducts.filter(p => p.product_type === name).length
        }));

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
                if (product.product_type && product.product_type !== 'Uncategorized') {
                  const { data: existingCat } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('merchant_id', merchantId)
                    .eq('name', product.product_type)
                    .single();

                  if (existingCat) {
                    categoryId = existingCat.id;
                  } else {
                    const slug = product.product_type.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                    const { data: newCat } = await supabase
                      .from('categories')
                      .insert({ 
                        merchant_id: merchantId, 
                        name: product.product_type,
                        slug: slug 
                      })
                      .select('id')
                      .single();
                    if (newCat) categoryId = newCat.id;
                  }
                }

                const hasMultipleVariants = product.variants && product.variants.length > 1;
                const mainVariant = product.variants?.[0];

                let description = product.description || '';
                if (description.length > 2000) {
                  description = description.substring(0, 2000) + '...';
                }

                const productData = {
                  merchant_id: merchantId,
                  name: product.title,
                  description: description || null,
                  price: mainVariant?.price || product.price || 0,
                  sku: mainVariant?.sku || null,
                  stock_quantity: mainVariant?.inventory_quantity ?? null,
                  category_id: categoryId,
                  image_url: product.image || null,
                  badge: product.tags?.[0] || null,
                  meta_title: product.title,
                  meta_description: description?.substring(0, 160) || null,
                  shopify_id: String(product.id)
                };

                const { data: insertedProduct, error: productError } = await supabase
                  .from('products')
                  .insert(productData)
                  .select('id')
                  .single();

                if (productError) {
                  throw new Error(`Product "${product.title}": ${productError.message}`);
                }

                if (hasMultipleVariants && insertedProduct && product.options) {
                  const variantsData = product.variants.map((variant: any) => {
                    const options: Record<string, string> = {};
                    if (variant.option1 && product.options[0]) {
                      options[product.options[0].name.toLowerCase()] = variant.option1;
                    }
                    if (variant.option2 && product.options[1]) {
                      options[product.options[1].name.toLowerCase()] = variant.option2;
                    }
                    if (variant.option3 && product.options[2]) {
                      options[product.options[2].name.toLowerCase()] = variant.option3;
                    }

                    return {
                      product_id: insertedProduct.id,
                      name: variant.title !== 'Default Title' ? variant.title : product.title,
                      sku: variant.sku || null,
                      price: variant.price || 0,
                      stock_quantity: variant.inventory_quantity ?? null,
                      options: options,
                      shopify_variant_id: String(variant.id)
                    };
                  });

                  const { error: variantsError } = await supabase
                    .from('product_variants')
                    .insert(variantsData);

                  if (variantsError) {
                    logger.error('Variants error:', variantsError);
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
    logger.error('Shopify import error:', err);
    return NextResponse.json(
      { error: err.message || 'Import failed' },
      { status: 500 }
    );
  }
}
