CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_name TEXT NOT NULL,
  business_name TEXT,
  subdomain TEXT NOT NULL UNIQUE,
  custom_domain TEXT UNIQUE,
  domain_verified BOOLEAN DEFAULT false,
  currency TEXT NOT NULL DEFAULT 'USD',
  locale TEXT DEFAULT 'en-US',
  email TEXT,
  phone TEXT,
  description TEXT,
  business_address TEXT,
  store_email TEXT,
  store_industry TEXT,
  order_notification_email TEXT,
  stripe_account_id TEXT,
  stripe_customer_id TEXT,
  ai_provider TEXT DEFAULT 'openai',
  ai_api_key TEXT,
  ai_model TEXT,
  ai_tone TEXT,
  ai_custom_instructions TEXT,
  ai_negotiation_style TEXT,
  ai_character_name TEXT,
  ai_character_persona TEXT,
  ai_character_avatar_url TEXT,
  ai_character_backstory TEXT,
  ai_refund_policy TEXT DEFAULT 'approval_required',
  ai_max_refund_amount NUMERIC(10,2) DEFAULT 0,
  ai_loyalty_policy TEXT DEFAULT 'autonomous',
  ai_shipping_policy TEXT DEFAULT 'autonomous',
  ai_auto_negotiation_enabled BOOLEAN DEFAULT false,
  ai_mission_visibility_enabled BOOLEAN DEFAULT false,
  ai_max_discount_percentage NUMERIC(5,2) DEFAULT 0,
  ai_responses_enabled BOOLEAN DEFAULT true,
  conversation_logging_enabled BOOLEAN DEFAULT true,
  abandoned_cart_recovery_enabled BOOLEAN DEFAULT false,
  low_stock_alerts_enabled BOOLEAN DEFAULT false,
  low_stock_threshold INTEGER DEFAULT 10,
  bargain_mode_enabled BOOLEAN DEFAULT false,
  bargain_ai_personality TEXT DEFAULT 'friendly',
  smtp_enabled BOOLEAN DEFAULT false,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  smtp_from_name TEXT,
  payment_methods JSONB DEFAULT '{}'::jsonb,
  shipping_settings JSONB DEFAULT '{"zones":[]}'::jsonb,
  tax_settings JSONB DEFAULT '{}'::jsonb,
  notification_settings JSONB DEFAULT '{}'::jsonb,
  auth_settings JSONB DEFAULT '{}'::jsonb,
  branding_settings JSONB DEFAULT '{}'::jsonb,
  google_search_console_id TEXT,
  bing_verification_id TEXT,
  mcp_api_key TEXT,
  mcp_client_id TEXT,
  mcp_client_secret TEXT,
  shopify_config JSONB DEFAULT '{}'::jsonb,
  woocommerce_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'staff',
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (merchant_id, user_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (merchant_id, email)
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(12,2),
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  badge TEXT,
  category TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  stock_quantity INTEGER DEFAULT 0,
  sku TEXT,
  weight NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  bargain_enabled BOOLEAN DEFAULT false,
  bargain_min_price NUMERIC(12,2),
  type TEXT DEFAULT 'physical',
  is_gift_card BOOLEAN DEFAULT false,
  digital_file_url TEXT,
  digital_file_name TEXT,
  track_quantity BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT,
  sku TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_email TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  title TEXT,
  body TEXT,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  min_order_amount NUMERIC(12,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (merchant_id, code)
);

CREATE TABLE IF NOT EXISTS storefront_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  session_id TEXT,
  consumer_email TEXT,
  status TEXT DEFAULT 'active',
  event_type TEXT,
  event_data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bargained_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  original_price NUMERIC(12,2) NOT NULL,
  bargained_price NUMERIC(12,2) NOT NULL,
  discount_percentage NUMERIC(6,2),
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  session_id TEXT,
  consumer_email TEXT,
  decision_type TEXT NOT NULL,
  factors JSONB DEFAULT '{}'::jsonb,
  outcome JSONB DEFAULT '{}'::jsonb,
  accepted BOOLEAN,
  confidence NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES storefront_conversations(id) ON DELETE SET NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  customer_info JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_details JSONB DEFAULT '{}'::jsonb,
  ai_assisted BOOLEAN DEFAULT false,
  ai_negotiated BOOLEAN DEFAULT false,
  ai_revenue_delta NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_categories_merchant_id ON categories(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_discounts_merchant_id ON discounts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_storefront_conversations_merchant_id ON storefront_conversations(merchant_id);
CREATE INDEX IF NOT EXISTS idx_bargained_prices_session_id ON bargained_prices(session_id);
CREATE INDEX IF NOT EXISTS idx_store_customers_merchant_email ON store_customers(merchant_id, email);

DROP TRIGGER IF EXISTS merchants_set_updated_at ON merchants;
CREATE TRIGGER merchants_set_updated_at BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS staff_members_set_updated_at ON staff_members;
CREATE TRIGGER staff_members_set_updated_at BEFORE UPDATE ON staff_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS customers_set_updated_at ON customers;
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS store_customers_set_updated_at ON store_customers;
CREATE TRIGGER store_customers_set_updated_at BEFORE UPDATE ON store_customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS categories_set_updated_at ON categories;
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS product_variants_set_updated_at ON product_variants;
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS product_reviews_set_updated_at ON product_reviews;
CREATE TRIGGER product_reviews_set_updated_at BEFORE UPDATE ON product_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS discounts_set_updated_at ON discounts;
CREATE TRIGGER discounts_set_updated_at BEFORE UPDATE ON discounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS storefront_conversations_set_updated_at ON storefront_conversations;
CREATE TRIGGER storefront_conversations_set_updated_at BEFORE UPDATE ON storefront_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS bargained_prices_set_updated_at ON bargained_prices;
CREATE TRIGGER bargained_prices_set_updated_at BEFORE UPDATE ON bargained_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS ai_decision_log_set_updated_at ON ai_decision_log;
CREATE TRIGGER ai_decision_log_set_updated_at BEFORE UPDATE ON ai_decision_log FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS order_items_set_updated_at ON order_items;
CREATE TRIGGER order_items_set_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
