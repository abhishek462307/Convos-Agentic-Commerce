import { NextResponse } from 'next/server';
import { authorizeMigrationRequest, buildAdminRlsPolicySql } from '@/lib/migration-auth';

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // SQL migration - use DROP POLICY IF EXISTS before CREATE
  const sql = `
-- Add bargain mode fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS bargain_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bargain_min_price DECIMAL(10, 2) DEFAULT NULL;

-- Add merchant-level bargain settings  
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bargain_mode_enabled BOOLEAN DEFAULT false;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bargain_ai_personality TEXT DEFAULT 'friendly';

-- Create bargained_prices table (if not exists)
CREATE TABLE IF NOT EXISTS bargained_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  bargained_price DECIMAL(10, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2) NOT NULL,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_bargained_prices_session ON bargained_prices(session_id, product_id);
CREATE INDEX IF NOT EXISTS idx_bargained_prices_merchant ON bargained_prices(merchant_id);

-- Enable RLS
${buildAdminRlsPolicySql('bargained_prices')}
  `;

  return NextResponse.json({ 
    success: true, 
    message: 'Copy and run this SQL in Supabase Dashboard → SQL Editor',
    sql
  });
}

export async function GET(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({ 
    message: 'POST to this endpoint to get the migration SQL',
    instructions: 'Copy the SQL from the response and run it in Supabase Dashboard → SQL Editor'
  });
}
