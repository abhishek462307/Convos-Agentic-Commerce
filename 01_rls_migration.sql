-- ==========================================
-- Phase 1: Security & Stability (RLS Setup)
-- ==========================================
-- This script enables Row Level Security (RLS) on core tables to isolate merchant-owned data.
-- Execute this in the Supabase SQL Editor.

-- 1. Enable RLS on core tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- 2. Merchants Table Policies
-- Public can read merchant configs to render storefronts
CREATE POLICY "Public can read active merchant storefronts" 
ON merchants FOR SELECT 
USING (true);

-- Owners can fully manage their own merchant record
CREATE POLICY "Owners manage their own merchant profile"
ON merchants FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- 3. Products Table Policies
-- Public can read all active products
CREATE POLICY "Public can view products" 
ON products FOR SELECT 
USING (status = 'active' OR status IS NULL);

-- Merchants can manage their own products
CREATE POLICY "Merchants manage their own products" 
ON products FOR ALL
USING (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
)
WITH CHECK (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
);


-- 4. Orders Table Policies
-- Merchants can manage their own orders
CREATE POLICY "Merchants manage their own orders" 
ON orders FOR ALL
USING (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
)
WITH CHECK (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
);

-- Note: Customer order reading policies would be added here if customers have actual auth accounts
-- CREATE POLICY "Shoppers can view their own orders" ON orders FOR SELECT USING (customer_auth_id = auth.uid());


-- 5. Customers Table Policies (Merchant's customer CRM)
-- Merchants can manage their own customers
CREATE POLICY "Merchants manage their own customers CRM" 
ON customers FOR ALL
USING (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
)
WITH CHECK (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
);


-- 6. Staff Members Policies
-- Staff can see records (Basic implementation)
CREATE POLICY "Owners can manage staff" 
ON staff_members FOR ALL
USING (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
)
WITH CHECK (
  merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
);

-- Staff can read their own membership
CREATE POLICY "Staff can read own memberships"
ON staff_members FOR SELECT
USING (user_id = auth.uid());
