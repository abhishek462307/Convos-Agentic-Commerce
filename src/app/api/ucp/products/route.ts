import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/ucp-utils';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const merchant = await getMerchantFromRequest(host);

  if (!merchant) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Fetch products
  const { data: products, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('merchant_id', merchant.id)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;

  const ucpProducts = products.map(product => ({
    id: product.id,
    type: 'dev.ucp.shopping.product',
    attributes: {
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: product.category,
      price: {
        amount: product.price,
        currency: merchant.currency || 'USD',
      },
      inventory: {
        status: product.stock_quantity > 0 ? 'in_stock' : 'out_of_stock',
        quantity: product.stock_quantity,
      },
      media: product.product_images?.map((img: any) => ({
        url: img.image_url,
        type: 'image',
      })) || [{ url: product.image_url, type: 'image' }],
      capabilities: {
        negotiable: product.bargain_enabled,
        floor_price: product.bargain_min_price,
      },
      metadata: product.specifications || {},
    },
    links: {
      self: `${baseUrl}/api/ucp/products/${product.id}`,
      checkout: `${baseUrl}/api/ucp/checkout?product_id=${product.id}`,
    }
  }));

  return NextResponse.json({
    object: 'list',
    data: ucpProducts,
    meta: {
      total: ucpProducts.length,
      merchant_id: merchant.id,
    }
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
