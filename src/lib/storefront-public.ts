import { supabaseAdmin } from '@/lib/supabase-admin';
import { unstable_cache } from 'next/cache';

async function getSingleMerchant() {
  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (merchantError) {
    throw merchantError;
  }

  return merchant;
}

export async function getStorefrontBrowseData(subdomain: string, categoryId?: string | null) {
  return unstable_cache(
    async () => {
  const merchant = await getSingleMerchant();

  if (!merchant) {
    return null;
  }

  const [productsRes, categoriesRes, categoryRes] = await Promise.all([
    supabaseAdmin.from('products').select('*').eq('merchant_id', merchant.id),
    supabaseAdmin.from('categories').select('*').eq('merchant_id', merchant.id),
    categoryId
      ? supabaseAdmin.from('categories').select('*').eq('merchant_id', merchant.id).eq('id', categoryId).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (categoryRes.error && categoryId) throw categoryRes.error;

      return {
        merchant,
        products: productsRes.data || [],
        categories: categoriesRes.data || [],
        category: categoryRes.data || null,
      };
    },
    [`storefront-browse-single-merchant-${categoryId || 'all'}`],
    { revalidate: 300, tags: ['merchant-single'] }
  )();
}

export async function getStorefrontProductData(subdomain: string, productId: string) {
  return unstable_cache(
    async () => {
  const merchant = await getSingleMerchant();

  if (!merchant) {
    return null;
  }

  const [productRes, imagesRes, variantsRes, reviewsRes] = await Promise.all([
    supabaseAdmin.from('products').select('*').eq('id', productId).eq('merchant_id', merchant.id).single(),
    supabaseAdmin.from('product_images').select('*').eq('product_id', productId).order('position'),
    supabaseAdmin.from('product_variants').select('*').eq('product_id', productId).eq('is_active', true),
    supabaseAdmin
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (productRes.error) throw productRes.error;
  if (imagesRes.error) throw imagesRes.error;
  if (variantsRes.error) throw variantsRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  const product = productRes.data;
  if (!product) {
    return { merchant, product: null, images: [], variants: [], reviews: [], relatedProducts: [] };
  }

  let relatedProducts: any[] = [];
  if (product.category) {
    const relatedRes = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('merchant_id', merchant.id)
      .eq('category', product.category)
      .neq('id', productId)
      .eq('status', 'active')
      .limit(4);
    if (relatedRes.error) throw relatedRes.error;
    relatedProducts = relatedRes.data || [];
  }

      return {
        merchant,
        product,
        images: imagesRes.data || [],
        variants: variantsRes.data || [],
        reviews: reviewsRes.data || [],
        relatedProducts,
      };
    },
    [`storefront-product-single-merchant-${productId}`],
    { revalidate: 300, tags: ['merchant-single', `product-${productId}`] }
  )();
}
