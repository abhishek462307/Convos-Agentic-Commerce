import { NextResponse } from 'next/server';
import { authorizeMigrationRequest, buildAdminRlsPolicySql } from '@/lib/migration-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const results: Record<string, string> = {};

  const statements = [
    {
      name: 'agent_plans.current_step',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS current_step integer DEFAULT 0;`
    },
    {
      name: 'agent_plans.updated_at',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();`
    },
    {
      name: 'agent_plans.is_approved',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;`
    },
    {
      name: 'agent_plans.started_at',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS started_at timestamptz;`
    },
    {
      name: 'agent_plans.completed_at',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS completed_at timestamptz;`
    },
    {
      name: 'agent_plans.last_checked_at',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;`
    },
    {
      name: 'agent_plans.last_error',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS last_error text;`
    },
    {
      name: 'agent_plans.attempt_count',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0;`
    },
    {
      name: 'agent_plans.next_retry_at',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;`
    },
    {
      name: 'agent_plans.paused_at',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS paused_at timestamptz;`
    },
    {
      name: 'agent_plans.metadata',
      sql: `ALTER TABLE agent_plans ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;`
    },
    {
      name: 'agent_memory.updated_at',
      sql: `ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();`
    },
    {
      name: 'agent_memory.confidence_score',
      sql: `ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS confidence_score numeric(3,2) DEFAULT 0.5;`
    },
    {
      name: 'agent_memory.metadata',
      sql: `ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;`
    },
    {
      name: 'refunds table',
      sql: `CREATE TABLE IF NOT EXISTS refunds (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id uuid REFERENCES orders(id),
        merchant_id uuid NOT NULL,
        consumer_email text NOT NULL,
        reason text,
        status text DEFAULT 'pending',
        amount decimal(10,2),
        created_at timestamptz DEFAULT now()
      );`
    },
      {
        name: 'refunds RLS',
        sql: buildAdminRlsPolicySql('refunds')
      },
      {
        name: 'callback_requests table',
        sql: `CREATE TABLE IF NOT EXISTS callback_requests (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          merchant_id uuid NOT NULL,
          name text NOT NULL,
          phone text NOT NULL,
          email text,
          message text,
          preferred_time text,
          status text DEFAULT 'pending',
          created_at timestamptz DEFAULT now()
        );`
      },
      {
        name: 'callback_requests RLS',
        sql: buildAdminRlsPolicySql('callback_requests')
      },
      {
        name: 'products.woocommerce_id',
        sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS woocommerce_id text;`
      },
      {
        name: 'product_variants.woocommerce_variant_id',
        sql: `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS woocommerce_variant_id text;`
      },
    ];

  for (const stmt of statements) {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: stmt.sql });
    results[stmt.name] = error ? `ERROR: ${error.message}` : 'OK';
  }

  return NextResponse.json({ results });
}
