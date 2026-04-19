import { NextResponse } from 'next/server';
import { authorizeMigrationRequest, buildAdminRlsPolicySql } from '@/lib/migration-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const statements = [
  {
    name: 'agent_plans.started_at',
    sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS started_at timestamptz;`,
  },
  {
    name: 'agent_plans.completed_at',
    sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS completed_at timestamptz;`,
  },
  {
    name: 'agent_plans.last_checked_at',
    sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;`,
  },
  {
    name: 'agent_plans.last_error',
    sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS last_error text;`,
  },
  {
    name: 'agent_plans.attempt_count',
    sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0;`,
  },
  {
    name: 'agent_plans.next_retry_at',
    sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;`,
  },
  {
    name: 'agent_plans.paused_at',
    sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS paused_at timestamptz;`,
  },
  {
    name: 'agent_plans.metadata',
    sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;`,
  },
  {
    name: 'agent_action_logs table',
    sql: `
      CREATE TABLE IF NOT EXISTS agent_action_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid NOT NULL,
        action_type text NOT NULL,
        description text NOT NULL,
        status text NOT NULL DEFAULT 'success',
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      );
    `,
  },
  {
    name: 'agent_action_logs indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS agent_action_logs_plan_id_idx ON agent_action_logs(plan_id);
      CREATE INDEX IF NOT EXISTS agent_action_logs_created_at_idx ON agent_action_logs(created_at DESC);
    `,
  },
  {
    name: 'agent_plans indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS agent_plans_status_idx ON agent_plans(status);
      CREATE INDEX IF NOT EXISTS agent_plans_intent_id_idx ON agent_plans(intent_id);
    `,
  },
  {
    name: 'customer_intents indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS customer_intents_merchant_id_idx ON customer_intents(merchant_id);
      CREATE INDEX IF NOT EXISTS customer_intents_status_idx ON customer_intents(status);
    `,
  },
  {
    name: 'customer_intents merchant fk',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'customer_intents'
            AND constraint_name = 'customer_intents_merchant_id_fkey'
        ) THEN
          ALTER TABLE customer_intents
            ADD CONSTRAINT customer_intents_merchant_id_fkey
            FOREIGN KEY (merchant_id)
            REFERENCES merchants(id)
            ON DELETE CASCADE;
        END IF;
      END $$;
    `,
  },
  {
    name: 'agent_plans intent fk',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'agent_plans'
            AND constraint_name = 'agent_plans_intent_id_fkey'
        ) THEN
          ALTER TABLE agent_plans
            ADD CONSTRAINT agent_plans_intent_id_fkey
            FOREIGN KEY (intent_id)
            REFERENCES customer_intents(id)
            ON DELETE CASCADE;
        END IF;
      END $$;
    `,
  },
  {
    name: 'agent_action_logs plan fk',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'agent_action_logs'
            AND constraint_name = 'agent_action_logs_plan_id_fkey'
        ) THEN
          ALTER TABLE agent_action_logs
            ADD CONSTRAINT agent_action_logs_plan_id_fkey
            FOREIGN KEY (plan_id)
            REFERENCES agent_plans(id)
            ON DELETE CASCADE;
        END IF;
      END $$;
    `,
  },
  {
    name: 'agent_action_logs RLS',
    sql: buildAdminRlsPolicySql('agent_action_logs'),
  },
  {
    name: 'reload schema cache',
    sql: `NOTIFY pgrst, 'reload schema';`,
  },
];

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const results: Record<string, string> = {};

  for (const statement of statements) {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: statement.sql });
    results[statement.name] = error ? `ERROR: ${error.message}` : 'OK';
  }

  const hasFailures = Object.values(results).some((value) => value.startsWith('ERROR:'));
  return NextResponse.json({ success: !hasFailures, results }, { status: hasFailures ? 500 : 200 });
}
