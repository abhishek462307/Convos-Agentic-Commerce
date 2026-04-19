import { NextResponse } from 'next/server';
import { authorizeMigrationRequest, buildAdminRlsPolicySql } from '@/lib/migration-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS ai_assisted BOOLEAN DEFAULT false;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS ai_negotiated BOOLEAN DEFAULT false;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS ai_revenue_delta DECIMAL(15,2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS conversation_id_ref UUID;

        CREATE TABLE IF NOT EXISTS ai_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          merchant_id UUID NOT NULL,
          event_type TEXT NOT NULL,
          event_data JSONB DEFAULT '{}',
          consumer_email TEXT,
          conversation_id UUID,
          session_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_ai_events_merchant ON ai_events(merchant_id);
        CREATE INDEX IF NOT EXISTS idx_ai_events_type ON ai_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_ai_events_created ON ai_events(merchant_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_orders_ai_assisted ON orders(merchant_id, ai_assisted);

        ${buildAdminRlsPolicySql('ai_events')}
      `
    });

    if (error) {
      logger.error('AI metrics migration error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'AI metrics tables created' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
