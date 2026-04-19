import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function runMigration() {
  console.log('Running Consumer Profiling migration...');

  try {
    console.log('Creating global_consumer_profiles table...');
    await sql`
      CREATE TABLE IF NOT EXISTS global_consumer_profiles (
        email TEXT PRIMARY KEY,
        trust_score INTEGER DEFAULT 80,
        risk_level TEXT DEFAULT 'low',
        total_orders_global INTEGER DEFAULT 0,
        total_spent_global DECIMAL(15,2) DEFAULT 0,
        refund_count_global INTEGER DEFAULT 0,
        chargeback_count_global INTEGER DEFAULT 0,
        risk_flags JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    console.log('Creating consumer_risk_reports table...');
    await sql`
      CREATE TABLE IF NOT EXISTS consumer_risk_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
        consumer_email TEXT NOT NULL,
        reason TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    console.log('Enabling RLS and creating policies...');
    await sql`ALTER TABLE global_consumer_profiles ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE consumer_risk_reports ENABLE ROW LEVEL SECURITY`;
    
    // Drop existing if any to avoid errors on rerun
    await sql`DROP POLICY IF EXISTS "Allow all for admin" ON global_consumer_profiles`;
    await sql`DROP POLICY IF EXISTS "Allow all for admin" ON consumer_risk_reports`;
    
    await sql`CREATE POLICY "Allow all for admin" ON global_consumer_profiles FOR ALL USING (true)`;
    await sql`CREATE POLICY "Allow all for admin" ON consumer_risk_reports FOR ALL USING (true)`;

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

runMigration();
