import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = rateLimit(`newsletter:${ip}`, { maxRequests: 5, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { email, name, subdomain, source = 'store' } = await request.json();

    if (!email || !subdomain) {
      return NextResponse.json({ error: 'Email and subdomain are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('merchant_id', merchant.id)
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      if (existing.status === 'unsubscribed') {
        await supabase
          .from('newsletter_subscribers')
          .update({ 
            status: 'active', 
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null 
          })
          .eq('id', existing.id);
        
        return NextResponse.json({ success: true, message: 'Re-subscribed successfully' });
      }
      return NextResponse.json({ success: true, message: 'Already subscribed' });
    }

    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        merchant_id: merchant.id,
        email: email.toLowerCase(),
        name: name || null,
        source
      });

    if (insertError) {
      logger.error('Newsletter subscription error:', insertError);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    // Trigger Welcome Automation
    try {
      const { triggerAutomation } = await import('@/lib/marketing-automations');
      await triggerAutomation('new_subscriber', merchant.id, { 
        email: email.toLowerCase(), 
        name,
      });
    } catch (e) {
      logger.error('Automation trigger error:', e);
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (err: any) {
    logger.error('Newsletter error:', err);
    return NextResponse.json({ error: err.message || 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { email, subdomain } = await request.json();

    if (!email || !subdomain) {
      return NextResponse.json({ error: 'Email and subdomain are required' }, { status: 400 });
    }

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    await supabase
      .from('newsletter_subscribers')
      .update({ 
        status: 'unsubscribed', 
        unsubscribed_at: new Date().toISOString() 
      })
      .eq('merchant_id', merchant.id)
      .eq('email', email.toLowerCase());

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to unsubscribe' }, { status: 500 });
  }
}
