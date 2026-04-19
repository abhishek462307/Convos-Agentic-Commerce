-- 1. Product Type & Digital/Gift Card Fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'physical';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_gift_card BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_file_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_file_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_quantity BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Gift Cards Table
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  initial_value DECIMAL(10,2) NOT NULL,
  remaining_value DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  customer_id UUID,
  expiry_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Product Bundles Table
CREATE TABLE IF NOT EXISTS product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  child_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Inventory Locations Table
CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address JSONB,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inventory Levels Table (Multi-location)
CREATE TABLE IF NOT EXISTS inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
  available INTEGER DEFAULT 0,
  reserved INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, variant_id, location_id)
);

-- 6. Inventory History Table
CREATE TABLE IF NOT EXISTS inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  reason TEXT,
  reference_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Global Consumer Profiles (Shared Risk/Credibility)
CREATE TABLE IF NOT EXISTS global_consumer_profiles (
  email TEXT PRIMARY KEY,
  trust_score INTEGER DEFAULT 80,
  risk_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  total_orders_global INTEGER DEFAULT 0,
  total_spent_global DECIMAL(15,2) DEFAULT 0,
  refund_count_global INTEGER DEFAULT 0,
  chargeback_count_global INTEGER DEFAULT 0,
  risk_flags JSONB DEFAULT '[]', -- Array of strings e.g., ['frequent_returns', 'payment_disputes']
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Consumer Risk Reports (Merchant Reporting)
CREATE TABLE IF NOT EXISTS consumer_risk_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  consumer_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies (Note: You might need to adjust these based on your RLS setup)
ALTER TABLE global_consumer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_risk_reports ENABLE ROW LEVEL SECURITY;

-- Allow merchants to read profiles (conceptually, via API is safer, but here's a policy)
-- CREATE POLICY "Merchants can read profiles" ON global_consumer_profiles FOR SELECT USING (true);
