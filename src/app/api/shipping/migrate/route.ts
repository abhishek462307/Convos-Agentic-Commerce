import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-migration-secret');
  if (secret !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const statements = [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS weight numeric(10,3)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'kg'`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS length numeric(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS width numeric(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS height numeric(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS dimension_unit text DEFAULT 'cm'`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_shipping boolean DEFAULT true`,
      `CREATE TABLE IF NOT EXISTS shipping_labels (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
        carrier_id text NOT NULL,
        carrier_name text,
        service_code text,
        service_name text,
        tracking_number text,
        tracking_url text,
        label_url text,
        label_format text DEFAULT 'PDF',
        rate_price numeric(10,2),
        rate_currency text DEFAULT 'USD',
        from_address jsonb,
        to_address jsonb,
        package_details jsonb,
        raw_response jsonb,
        status text DEFAULT 'created',
        created_at timestamptz DEFAULT now()
      )`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_label_id uuid REFERENCES shipping_labels(id)`,
      `CREATE INDEX IF NOT EXISTS idx_shipping_labels_merchant ON shipping_labels(merchant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_shipping_labels_order ON shipping_labels(order_id)`,
      `CREATE INDEX IF NOT EXISTS idx_shipping_labels_tracking ON shipping_labels(tracking_number)`,
    ];

    const errors: string[] = [];
    for (const sql of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql }).maybeSingle();
      if (error && !error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        errors.push(`${sql.slice(0, 60)}... => ${error.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: errors.length === 0 ? 'All migrations applied' : 'Partial success',
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    logger.error('Migration error:', error);

    const { error: configError } = await supabase
      .from('shipping_carrier_configs')
      .select('id')
      .limit(1);

    if (configError && configError.code === '42P01') {
      return NextResponse.json({ 
        error: 'Tables need to be created manually. Run the SQL migration.',
        sql: `
CREATE TABLE IF NOT EXISTS shipping_carrier_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  carrier_slug VARCHAR(100) NOT NULL,
  carrier_name VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN DEFAULT true,
  credentials JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, carrier_slug)
);

CREATE TABLE IF NOT EXISTS shipping_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  order_id UUID,
  carrier_slug VARCHAR(100) NOT NULL,
  tracking_number VARCHAR(255),
  label_url TEXT,
  label_data TEXT,
  label_format VARCHAR(20) DEFAULT 'PDF',
  shipment_cost DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'created',
  ship_from JSONB,
  ship_to JSONB,
  package_details JSONB,
  carrier_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
        `
      }, { status: 400 });
    }

      return NextResponse.json({ success: true, message: 'Tables already exist or created successfully' });
    }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Shipping migration endpoint. POST to run migrations.',
    sql: `
-- Run this SQL in Supabase Dashboard > SQL Editor:

CREATE TABLE IF NOT EXISTS shipping_carrier_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  carrier_slug VARCHAR(100) NOT NULL,
  carrier_name VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN DEFAULT true,
  credentials JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, carrier_slug)
);

CREATE TABLE IF NOT EXISTS shipping_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  order_id UUID,
  carrier_slug VARCHAR(100) NOT NULL,
  tracking_number VARCHAR(255),
  label_url TEXT,
  label_data TEXT,
  label_format VARCHAR(20) DEFAULT 'PDF',
  shipment_cost DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'created',
  ship_from JSONB,
  ship_to JSONB,
  package_details JSONB,
  carrier_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_configs_merchant ON shipping_carrier_configs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_merchant ON shipping_labels(merchant_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_order ON shipping_labels(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_tracking ON shipping_labels(tracking_number);
    `
  });
}
