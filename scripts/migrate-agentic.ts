import postgres from 'postgres';

// Bun natively supports .env files
const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
  console.log('🚀 Starting Agentic Commerce Migration...');

  try {
    // 1. Customer Intents (Long-term missions)
    await sql`
      CREATE TABLE IF NOT EXISTS customer_intents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
        consumer_email TEXT NOT NULL,
        intent_type TEXT NOT NULL,
        goal TEXT NOT NULL,
        constraints JSONB DEFAULT '{}',
        status TEXT DEFAULT 'active',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(consumer_email, intent_type, goal)
      )
    `;
    console.log('✅ Created customer_intents table');

    // 2. Agent Plans (How the agent executes a mission)
    await sql`
      CREATE TABLE IF NOT EXISTS agent_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_id UUID REFERENCES customer_intents(id) ON DELETE CASCADE,
        steps JSONB DEFAULT '[]',
        status TEXT DEFAULT 'planning',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Created agent_plans table');

    // 3. Negotiation Logs (Agent-to-Merchant bargaining history)
    await sql`
      CREATE TABLE IF NOT EXISTS negotiation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_id UUID REFERENCES customer_intents(id) ON DELETE CASCADE,
        buyer_offer DECIMAL(10,2),
        merchant_offer DECIMAL(10,2),
        round_number INTEGER DEFAULT 1,
        outcome TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Created negotiation_logs table');

    // 4. Agent Memory (Preferences and facts)
    await sql`
      CREATE TABLE IF NOT EXISTS agent_memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        consumer_email TEXT NOT NULL,
        memory_key TEXT NOT NULL,
        memory_value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(consumer_email, memory_key)
      )
    `;
    console.log('✅ Created agent_memory table');

    // 5. Agent Permissions (Autonomy settings)
    await sql`
      CREATE TABLE IF NOT EXISTS agent_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        consumer_email TEXT NOT NULL UNIQUE,
        autonomy_level TEXT DEFAULT 'assisted',
        max_spend_limit DECIMAL(10,2) DEFAULT 0,
        can_negotiate BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Created agent_permissions table');

    // 6. Enable Realtime (Ignore errors if already enabled)
    try {
      await sql`ALTER PUBLICATION supabase_realtime ADD TABLE customer_intents`;
        await sql`ALTER PUBLICATION supabase_realtime ADD TABLE agent_plans`;
        await sql`ALTER PUBLICATION supabase_realtime ADD TABLE negotiation_logs`;
        await sql`ALTER PUBLICATION supabase_realtime ADD TABLE agent_memory`;
        await sql`ALTER PUBLICATION supabase_realtime ADD TABLE conversations`;
        await sql`ALTER PUBLICATION supabase_realtime ADD TABLE messages`;
      console.log('✅ Enabled Realtime for agentic tables');
    } catch {
      console.log('ℹ️ Realtime already enabled or publication missing');
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
