import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function runMigration() {
  console.log('Running Product Management System migration...');

  try {
    // 1. Product Type & Digital/Gift Card Fields
    console.log('Adding product fields...');
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'physical'`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_gift_card BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_file_url TEXT`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_file_name TEXT`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS track_quantity BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`;

    // 2. Gift Cards Table
    console.log('Creating gift_cards table...');
    await sql`
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
      )
    `;

    // 3. Product Bundles Table
    console.log('Creating product_bundles table...');
    await sql`
      CREATE TABLE IF NOT EXISTS product_bundles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        child_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 4. Inventory Locations Table
    console.log('Creating inventory_locations table...');
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address JSONB,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 5. Inventory Levels Table (Multi-location)
    console.log('Creating inventory_levels table...');
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
        location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
        available INTEGER DEFAULT 0,
        reserved INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(product_id, variant_id, location_id)
      )
    `;

    // 6. Inventory History Table
    console.log('Creating inventory_history table...');
    await sql`
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
      )
    `;

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

runMigration();
