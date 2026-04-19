import { getAuthUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

type MigrationStatement = {
  name: string
  sql: string
}

export const MERCHANT_ASSISTANT_SCHEMA_STATEMENTS: MigrationStatement[] = [
  {
    name: 'merchant_agent_threads table',
    sql: `
      CREATE TABLE IF NOT EXISTS merchant_agent_threads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id uuid NOT NULL,
        kind text NOT NULL DEFAULT 'main',
        title text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        parent_thread_id uuid NULL,
        linked_intent_id uuid NULL,
        linked_plan_id uuid NULL,
        last_message_at timestamptz DEFAULT now(),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        archived_at timestamptz NULL,
        metadata jsonb DEFAULT '{}'::jsonb
      );
    `,
  },
  {
    name: 'merchant_agent_messages table',
    sql: `
      CREATE TABLE IF NOT EXISTS merchant_agent_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id uuid NOT NULL,
        role text NOT NULL,
        message_type text NOT NULL DEFAULT 'chat',
        content text NOT NULL DEFAULT '',
        status text NULL,
        actions jsonb DEFAULT '[]'::jsonb,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      );
    `,
  },
  {
    name: 'merchant_agent_threads merchant fk',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'merchant_agent_threads'
            AND constraint_name = 'merchant_agent_threads_merchant_id_fkey'
        ) THEN
          ALTER TABLE merchant_agent_threads
            ADD CONSTRAINT merchant_agent_threads_merchant_id_fkey
            FOREIGN KEY (merchant_id)
            REFERENCES merchants(id)
            ON DELETE CASCADE;
        END IF;
      END $$;
    `,
  },
  {
    name: 'merchant_agent_threads parent fk',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'merchant_agent_threads'
            AND constraint_name = 'merchant_agent_threads_parent_thread_id_fkey'
        ) THEN
          ALTER TABLE merchant_agent_threads
            ADD CONSTRAINT merchant_agent_threads_parent_thread_id_fkey
            FOREIGN KEY (parent_thread_id)
            REFERENCES merchant_agent_threads(id)
            ON DELETE SET NULL;
        END IF;
      END $$;
    `,
  },
  {
    name: 'merchant_agent_threads mission fks',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'merchant_agent_threads'
            AND constraint_name = 'merchant_agent_threads_linked_intent_id_fkey'
        ) THEN
          ALTER TABLE merchant_agent_threads
            ADD CONSTRAINT merchant_agent_threads_linked_intent_id_fkey
            FOREIGN KEY (linked_intent_id)
            REFERENCES customer_intents(id)
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'merchant_agent_threads'
            AND constraint_name = 'merchant_agent_threads_linked_plan_id_fkey'
        ) THEN
          ALTER TABLE merchant_agent_threads
            ADD CONSTRAINT merchant_agent_threads_linked_plan_id_fkey
            FOREIGN KEY (linked_plan_id)
            REFERENCES agent_plans(id)
            ON DELETE SET NULL;
        END IF;
      END $$;
    `,
  },
  {
    name: 'merchant_agent_messages thread fk',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'merchant_agent_messages'
            AND constraint_name = 'merchant_agent_messages_thread_id_fkey'
        ) THEN
          ALTER TABLE merchant_agent_messages
            ADD CONSTRAINT merchant_agent_messages_thread_id_fkey
            FOREIGN KEY (thread_id)
            REFERENCES merchant_agent_threads(id)
            ON DELETE CASCADE;
        END IF;
      END $$;
    `,
  },
  {
    name: 'merchant assistant dedupe and indexes',
    sql: `
      WITH ranked_main_threads AS (
        SELECT
          id,
          row_number() OVER (PARTITION BY merchant_id ORDER BY created_at ASC, id ASC) AS row_num
        FROM merchant_agent_threads
        WHERE kind = 'main'
          AND archived_at IS NULL
      )
      UPDATE merchant_agent_threads
      SET archived_at = now(),
          status = 'archived',
          updated_at = now()
      WHERE id IN (
        SELECT id
        FROM ranked_main_threads
        WHERE row_num > 1
      );

      WITH ranked_mission_threads AS (
        SELECT
          id,
          row_number() OVER (PARTITION BY linked_intent_id ORDER BY created_at ASC, id ASC) AS row_num
        FROM merchant_agent_threads
        WHERE linked_intent_id IS NOT NULL
          AND archived_at IS NULL
      )
      UPDATE merchant_agent_threads
      SET archived_at = now(),
          status = 'archived',
          updated_at = now()
      WHERE id IN (
        SELECT id
        FROM ranked_mission_threads
        WHERE row_num > 1
      );

      CREATE INDEX IF NOT EXISTS merchant_agent_threads_merchant_id_idx ON merchant_agent_threads(merchant_id);
      CREATE INDEX IF NOT EXISTS merchant_agent_threads_last_message_at_idx ON merchant_agent_threads(last_message_at DESC);
      CREATE INDEX IF NOT EXISTS merchant_agent_threads_linked_intent_id_idx ON merchant_agent_threads(linked_intent_id);
      CREATE INDEX IF NOT EXISTS merchant_agent_threads_linked_plan_id_idx ON merchant_agent_threads(linked_plan_id);
      CREATE INDEX IF NOT EXISTS merchant_agent_messages_thread_id_idx ON merchant_agent_messages(thread_id);
      CREATE INDEX IF NOT EXISTS merchant_agent_messages_created_at_idx ON merchant_agent_messages(created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS merchant_agent_threads_single_main_idx
        ON merchant_agent_threads(merchant_id)
        WHERE kind = 'main' AND archived_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS merchant_agent_threads_single_mission_idx
        ON merchant_agent_threads(linked_intent_id)
        WHERE linked_intent_id IS NOT NULL AND archived_at IS NULL;
    `,
  },
  {
    name: 'merchant assistant RLS',
    sql: `
      ALTER TABLE merchant_agent_threads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE merchant_agent_messages ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Allow all for admin" ON merchant_agent_threads;
      DROP POLICY IF EXISTS "Allow all for admin" ON merchant_agent_messages;
      DROP POLICY IF EXISTS "Merchant assistant thread read access" ON merchant_agent_threads;
      DROP POLICY IF EXISTS "Merchant assistant message read access" ON merchant_agent_messages;

      CREATE POLICY "Merchant assistant thread read access"
      ON merchant_agent_threads
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM merchants
          WHERE merchants.id = merchant_agent_threads.merchant_id
            AND merchants.user_id = auth.uid()
        )
      );

      CREATE POLICY "Merchant assistant message read access"
      ON merchant_agent_messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM merchant_agent_threads
          WHERE merchant_agent_threads.id = merchant_agent_messages.thread_id
            AND (
              EXISTS (
                SELECT 1
                FROM merchants
                WHERE merchants.id = merchant_agent_threads.merchant_id
                  AND merchants.user_id = auth.uid()
              )
            )
        )
      );
    `,
  },
  {
    name: 'reload schema cache',
    sql: `NOTIFY pgrst, 'reload schema';`,
  },
];

let ensureMerchantAssistantSchemaPromise: Promise<void> | null = null;

export async function ensureMerchantAssistantSchema() {
  if (ensureMerchantAssistantSchemaPromise) {
    return ensureMerchantAssistantSchemaPromise;
  }

  ensureMerchantAssistantSchemaPromise = (async () => {
    for (const statement of MERCHANT_ASSISTANT_SCHEMA_STATEMENTS) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: statement.sql });
      if (error) {
        throw new Error(`Failed to apply ${statement.name}: ${error.message}`);
      }
    }
  })().catch((error) => {
    ensureMerchantAssistantSchemaPromise = null;
    throw error;
  });

  return ensureMerchantAssistantSchemaPromise;
}

export async function authorizeMerchantAssistantMigration(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret && secret === process.env.MIGRATION_SECRET) {
    return { ok: true as const };
  }

  const user = await getAuthUser(request);
  if (!user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const { data: owner } = await supabaseAdmin
    .from('merchants')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!owner) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }

  return { ok: true as const };
}
