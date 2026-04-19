import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all inventory locations for merchant
export async function GET(request: Request) {
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
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (merchantError) {
      console.error('Error fetching merchant:', merchantError);
      // PGRST116 = no rows returned (not found)
      if (merchantError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const { data: locations, error } = await supabase
      .from('inventory_locations')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ locations: locations || [] });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new location
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
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (merchantError) {
      console.error('Error fetching merchant:', merchantError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, address, city, state, country, pincode, is_default = false } = body;

    if (!name) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    // If setting as default, unset other defaults first with error handling
    if (is_default) {
      const { error: unsetError } = await supabase
        .from('inventory_locations')
        .update({ is_default: false })
        .eq('merchant_id', merchant.id);

      if (unsetError) {
        console.error('Failed to unset other defaults:', unsetError);
        return NextResponse.json({ error: 'Failed to update default location', details: unsetError.message }, { status: 500 });
      }
    }

    const { data: location, error } = await supabase
      .from('inventory_locations')
      .insert({
        merchant_id: merchant.id,
        name,
        address,
        city,
        state,
        country,
        pincode,
        is_default,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ location });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
