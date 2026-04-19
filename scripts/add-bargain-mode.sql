-- Add bargain mode fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS bargain_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bargain_min_price DECIMAL(10, 2) DEFAULT NULL;

-- Create bargained_prices table to track negotiated prices per session
CREATE TABLE IF NOT EXISTS bargained_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  bargained_price DECIMAL(10, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bargained_prices_session ON bargained_prices(session_id, product_id);
CREATE INDEX IF NOT EXISTS idx_bargained_prices_merchant ON bargained_prices(merchant_id);

-- Add RLS policies
ALTER TABLE bargained_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for bargained_prices" ON bargained_prices FOR ALL USING (true);

-- Add merchant-level bargain settings
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bargain_mode_enabled BOOLEAN DEFAULT false;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bargain_ai_personality TEXT DEFAULT 'friendly';

