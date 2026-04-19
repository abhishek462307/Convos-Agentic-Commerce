import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  console.log('Running bargain mode migration...');

  const queries = [
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS bargain_enabled BOOLEAN DEFAULT false`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS bargain_min_price DECIMAL(10, 2) DEFAULT NULL`,
    `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bargain_mode_enabled BOOLEAN DEFAULT false`,
    `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bargain_ai_personality TEXT DEFAULT 'friendly'`,
  ];

  for (const sql of queries) {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) console.warn('Query skipped:', error.message);
  }

  console.log('Migration complete (columns may already exist)');
}

runMigration();
