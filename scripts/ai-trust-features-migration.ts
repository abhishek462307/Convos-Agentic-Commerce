import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function runMigration() {
  console.log('Running AI Trust Features migration...');

  try {
    console.log('Adding override columns to ai_decision_log...');
    await sql`ALTER TABLE ai_decision_log ADD COLUMN IF NOT EXISTS override_status TEXT DEFAULT NULL`;
    await sql`ALTER TABLE ai_decision_log ADD COLUMN IF NOT EXISTS override_reason TEXT DEFAULT NULL`;
    await sql`ALTER TABLE ai_decision_log ADD COLUMN IF NOT EXISTS overridden_by UUID DEFAULT NULL`;
    await sql`ALTER TABLE ai_decision_log ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ DEFAULT NULL`;

    console.log('Creating decision_overrides table...');
    await sql`
      CREATE TABLE IF NOT EXISTS decision_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        decision_log_id UUID NOT NULL,
        merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        original_outcome JSONB NOT NULL DEFAULT '{}',
        new_outcome JSONB NOT NULL DEFAULT '{}',
        override_type TEXT NOT NULL,
        reason TEXT,
        created_by UUID DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    console.log('Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_decision_overrides_decision_log_id ON decision_overrides(decision_log_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_decision_overrides_merchant_id ON decision_overrides(merchant_id)`;

    console.log('Enabling RLS policies...');
    await sql`ALTER TABLE decision_overrides ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Allow all for admin" ON decision_overrides`;
    await sql`CREATE POLICY "Allow all for admin" ON decision_overrides FOR ALL USING (true)`;

    console.log('AI Trust Features migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

runMigration();
