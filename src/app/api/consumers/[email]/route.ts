import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

// Initialize regular Supabase client for auth check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Verify Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify Merchant Status
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 403 });
    }

    // 3. Fetch Consumer Profile & Intelligence (merchant-local)
    const [{ data: profile, error: profileError }, { data: memory }, { data: intents }, { data: permissions }] = await Promise.all([
      supabaseAdmin.from('store_customers').select('*').eq('merchant_id', merchant.id).eq('email', email).maybeSingle(),
      supabaseAdmin.from('agent_memory').select('*').eq('consumer_email', email),
      supabaseAdmin.from('customer_intents').select('*').eq('consumer_email', email),
      supabaseAdmin.from('agent_permissions').select('*').eq('consumer_email', email).single()
    ]);

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // If no profile exists, return a default/empty one
    const fullProfile = {
      ...(profile || {
        email,
        total_orders: 0,
        total_spent: 0
      }),
      intelligence: {
        memory: memory || [],
        intents: intents || [],
          permissions: permissions || {
            autonomy_level: 'assisted',
            max_spend_limit: 0,
            can_negotiate: true,
            can_checkout: true
          }
      }
    };

    return NextResponse.json(fullProfile);

  } catch (error) {
    logger.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
