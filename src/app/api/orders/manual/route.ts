import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // Verify merchant authentication via JWT token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split('Bearer ')[1];

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, store_name, currency, locale, tax_settings, shipping_settings, payment_methods')
      .eq('user_id', user.id)
      .single();

    if (merchantError) {
      console.error('Error fetching merchant:', merchantError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      customerInfo,
      items,
      shippingAmount = 0,
      taxAmount = 0,
      discountAmount = 0,
      notes = '',
      status = 'pending', // 'pending', 'draft'
      sendEmail = false,
    } = body;

    // Validate required fields
    if (!customerInfo?.email || !customerInfo?.name) {
      return NextResponse.json({ error: 'Customer name and email are required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Validate items have numeric price and positive quantity
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      if (!Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: `Invalid item at index ${i}: price must be non-negative and quantity must be positive` }, { status: 400 });
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (Number(item.price) * Number(item.quantity));
    }, 0);

    const totalAmount = Math.max(0, subtotal + shippingAmount + taxAmount - discountAmount);

    // Generate order number
    const orderNumber = `M-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        merchant_id: merchant.id,
        order_number: orderNumber,
        customer_info: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone || '',
          address: customerInfo.address || '',
          city: customerInfo.city || '',
          state: customerInfo.state || '',
          pincode: customerInfo.pincode || '',
          country: customerInfo.country || 'US',
        },
        items: items.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
          variant_id: item.variant_id || null,
          variant_name: item.variant_name || null,
        })),
        subtotal,
        shipping_amount: shippingAmount,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        status,
        payment_method: 'manual',
        payment_status: status === 'paid' ? 'paid' : 'pending',
        notes,
        source: 'manual',
        created_by: user.id,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating manual order:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Update inventory if order is not draft
    if (status !== 'draft') {
      const stockErrors: string[] = [];
      for (const item of items) {
        if (item.variant_id) {
          const { error: rpcError } = await supabase.rpc('decrement_variant_stock', {
            variant_id: item.variant_id,
            quantity: item.quantity,
          });
          if (rpcError) {
            console.error('Failed to decrement variant stock:', rpcError);
            stockErrors.push(`Variant ${item.variant_id}: ${rpcError.message}`);
          }
        } else if (item.product_id) {
          const { error: rpcError } = await supabase.rpc('decrement_product_stock', {
            product_id: item.product_id,
            quantity: item.quantity,
          });
          if (rpcError) {
            console.error('Failed to decrement product stock:', rpcError);
            stockErrors.push(`Product ${item.product_id}: ${rpcError.message}`);
          }
        }
      }
      if (stockErrors.length > 0) {
        // Log all errors but don't fail the order creation
        console.error('Inventory update errors:', stockErrors);
      }
    }

    // Send email if requested
    if (sendEmail && customerInfo.email) {
      try {
        await sendOrderConfirmationEmail({
          orderId: order.id,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          storeName: merchant.store_name || 'Store',
          items: items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal,
          shipping: shippingAmount,
          tax: taxAmount,
          total: totalAmount,
          currency: merchant.currency || 'USD',
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: orderNumber,
        totalAmount,
        status,
      },
    });

  } catch (error: any) {
    console.error('Manual order creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
