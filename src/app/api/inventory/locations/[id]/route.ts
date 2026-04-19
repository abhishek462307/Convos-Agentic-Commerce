import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH - Update location
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, address, city, state, country, pincode, is_active, is_default } = body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_default !== undefined) updateData.is_default = is_default;

    // First update the target row
    const { data: location, error } = await supabase
      .from('inventory_locations')
      .update(updateData)
      .eq('id', id)
      .eq('merchant_id', merchant.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If setting as default, unset other defaults only after successful target update
    if (is_default) {
      const { error: unsetError } = await supabase
        .from('inventory_locations')
        .update({ is_default: false })
        .eq('merchant_id', merchant.id)
        .neq('id', id);

      if (unsetError) {
        console.error('Failed to unset other defaults:', unsetError);
        // Log but don't fail the request as the main update succeeded
      }
    }

    return NextResponse.json({ location });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete location
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Check if location has inventory
    const { data: inventoryCount } = await supabase
      .from('product_inventory')
      .select('id', { count: 'exact' })
      .eq('location_id', id);

    if (inventoryCount && inventoryCount.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete location with existing inventory. Please transfer or remove inventory first.' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('inventory_locations')
      .delete()
      .eq('id', id)
      .eq('merchant_id', merchant.id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
