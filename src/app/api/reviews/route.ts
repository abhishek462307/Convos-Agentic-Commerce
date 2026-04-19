import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import { rateLimit } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const merchantId = searchParams.get('merchantId');
    const approvedOnly = searchParams.get('approved') === 'true';

    let query = supabase.from('product_reviews').select('*, products(name, merchant_id)');

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (merchantId && !productId) {
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const access = await getMerchantAccess(user.id, merchantId);
      if (!access.ok) {
        return NextResponse.json(
          { error: access.status === 404 ? 'Merchant not found' : 'Forbidden' },
          { status: access.status }
        );
      }

      query = query.eq('products.merchant_id', merchantId);
    }

    if (approvedOnly) {
      query = query.eq('is_approved', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reviews: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = rateLimit(`reviews:${ip}`, { maxRequests: 5, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { productId, customerEmail, customerName, rating, title, content } = await request.json();

    if (!productId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: productId,
        customer_email: customerEmail,
        customer_name: customerName,
        rating,
        title,
        content,
        is_approved: false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, review: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, is_approved } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing review id' }, { status: 400 });
    }

    const { data: review, error: reviewError } = await supabase
      .from('product_reviews')
      .select('id, product_id, products!inner(merchant_id)')
      .eq('id', id)
      .single();

    if (reviewError || !review || !(review as any).products?.merchant_id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const access = await getMerchantAccess(user.id, (review as any).products.merchant_id);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 404 ? 'Merchant not found' : 'Forbidden' },
        { status: access.status }
      );
    }

    const { error } = await supabase
      .from('product_reviews')
      .update({ is_approved })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing review id' }, { status: 400 });
    }

    const { data: review, error: reviewError } = await supabase
      .from('product_reviews')
      .select('id, product_id, products!inner(merchant_id)')
      .eq('id', id)
      .single();

    if (reviewError || !review || !(review as any).products?.merchant_id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const access = await getMerchantAccess(user.id, (review as any).products.merchant_id);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 404 ? 'Merchant not found' : 'Forbidden' },
        { status: access.status }
      );
    }

    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
