import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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

    const { orderId, provider = 'stripe' } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, merchant:merchant_id(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify merchant owns this order
    if (!order.merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }
    if (order.merchant.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only allow payment links for pending or draft orders
    if (order.status !== 'pending' && order.status !== 'draft') {
      return NextResponse.json({ error: 'Payment link can only be generated for pending or draft orders' }, { status: 400 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
    }

    const merchant = order.merchant;
    const paymentMethods = merchant.payment_methods || {};

    if (provider === 'stripe' && paymentMethods.stripe?.enabled) {
      const stripeSecretKey = paymentMethods.stripe.test_mode 
        ? paymentMethods.stripe.test_secret_key 
        : paymentMethods.stripe.secret_key;

      if (!stripeSecretKey) {
        return NextResponse.json({ error: 'Stripe is not configured' }, { status: 400 });
      }

      const stripe = new Stripe(stripeSecretKey);

      // Create or retrieve Stripe customer
      let customerId = order.customer_info?.stripe_customer_id;
      
      if (!customerId && order.customer_info?.email) {
        const customers = await stripe.customers.list({
          email: order.customer_info.email,
          limit: 1,
        });
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: order.customer_info.email,
            name: order.customer_info.name,
            phone: order.customer_info.phone,
            address: {
              line1: order.customer_info.address,
              city: order.customer_info.city,
              state: order.customer_info.state,
              postal_code: order.customer_info.pincode,
              country: order.customer_info.country,
            },
          });
          customerId = customer.id;
        }
      }

      // Create payment link
      const paymentLink = await stripe.paymentLinks.create({
        line_items: order.items.map((item: any) => ({
          price_data: {
            currency: merchant.currency || 'usd',
            product_data: {
              name: item.product_name,
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        ...(customerId && { customer: customerId }),
        metadata: {
          order_id: order.id,
          merchant_id: merchant.id,
          source: 'payment_link',
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${merchant.subdomain}/order-confirmation?order_id=${order.id}`,
          },
        },
      });

      // Update order with payment link
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_link_url: paymentLink.url,
          payment_link_id: paymentLink.id,
          payment_provider: 'stripe',
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Failed to update order with Stripe payment link:', updateError);
        // Attempt to delete the orphaned payment link
        try {
          await stripe.paymentLinks.update(paymentLink.id, { active: false });
        } catch (cleanupError) {
          console.error('Failed to cleanup Stripe payment link:', cleanupError);
        }
        return NextResponse.json({ error: 'Failed to save payment link' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        paymentLink: paymentLink.url,
        provider: 'stripe',
      });

    } else if (provider === 'razorpay' && paymentMethods.razorpay?.enabled) {
      // Razorpay payment link creation
      const keyId = paymentMethods.razorpay.test_mode 
        ? paymentMethods.razorpay.test_key_id 
        : paymentMethods.razorpay.key_id;
      const keySecret = paymentMethods.razorpay.test_mode 
        ? paymentMethods.razorpay.test_key_secret 
        : paymentMethods.razorpay.key_secret;

      if (!keyId || !keySecret) {
        return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 400 });
      }

      // Create Razorpay payment link via their API
      const razorpayResponse = await fetch('https://api.razorpay.com/v1/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'link',
          amount: Math.round(order.total_amount * 100), // Convert to paise
          currency: merchant.currency || 'INR',
          description: `Order #${order.order_number}`,
          customer: {
            name: order.customer_info?.name,
            email: order.customer_info?.email,
            contact: order.customer_info?.phone,
          },
          sms_notify: true,
          email_notify: true,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/orders/verify-razorpay`,
          notes: {
            order_id: order.id,
            merchant_id: merchant.id,
          },
        }),
      });

      if (!razorpayResponse.ok) {
        const error = await razorpayResponse.json();
        throw new Error(error.error?.description || 'Failed to create Razorpay payment link');
      }

      const razorpayData = await razorpayResponse.json();

      // Update order with payment link
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_link_url: razorpayData.short_url,
          payment_link_id: razorpayData.id,
          payment_provider: 'razorpay',
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Failed to update order with Razorpay payment link:', updateError);
        // Attempt to cancel the orphaned Razorpay link
        try {
          await fetch(`https://api.razorpay.com/v1/invoices/${razorpayData.id}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
            },
          });
        } catch (cleanupError) {
          console.error('Failed to cleanup Razorpay payment link:', cleanupError);
        }
        return NextResponse.json({ error: 'Failed to save payment link' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        paymentLink: razorpayData.short_url,
        provider: 'razorpay',
      });
    }

    return NextResponse.json({ error: 'No payment provider configured' }, { status: 400 });

  } catch (error: any) {
    console.error('Payment link creation error:', error);
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
  }
}
