import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { code, subdomain, orderAmount, eligibleAmount } = await request.json();

    if (!code || !subdomain) {
      return NextResponse.json({ error: 'Missing code or subdomain' }, { status: 400 });
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, branding_settings')
      .eq('subdomain', subdomain)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const branding = (merchant.branding_settings as any) || {};
    const excludeBargained = branding.exclude_bargained_from_discounts !== false;
    
    const amountForMinimum = orderAmount;
    const amountForDiscount = excludeBargained && eligibleAmount !== undefined ? eligibleAmount : orderAmount;

    const { data: discount, error: discountError } = await supabase
      .from('discounts')
      .select('*')
      .eq('merchant_id', merchant.id)
      .eq('code', code.toUpperCase())
      .single();

    if (discountError || !discount) {
      return NextResponse.json({ error: 'Invalid discount code' }, { status: 404 });
    }

    const now = new Date();
    
    if (discount.starts_at && new Date(discount.starts_at) > now) {
      return NextResponse.json({ error: 'Discount code is not active yet' }, { status: 400 });
    }

    if (discount.ends_at && new Date(discount.ends_at) < now) {
      return NextResponse.json({ error: 'Discount code has expired' }, { status: 400 });
    }

    if (discount.usage_limit && discount.used_count >= discount.usage_limit) {
      return NextResponse.json({ error: 'Discount code limit reached' }, { status: 400 });
    }

    if (amountForMinimum < discount.min_order_amount) {
      return NextResponse.json({ 
        error: `Minimum purchase of ${discount.min_order_amount} required for this code` 
      }, { status: 400 });
    }

    if (excludeBargained && eligibleAmount !== undefined && eligibleAmount <= 0) {
      return NextResponse.json({ 
        error: 'Discount codes cannot be applied - all items in cart have negotiated prices' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      discount: {
        id: discount.id,
        code: discount.code,
        type: discount.type,
        value: discount.value
      },
      excludeBargainedItems: excludeBargained,
      eligibleAmount: amountForDiscount
    });

  } catch (err: any) {
    logger.error('Discount validation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
