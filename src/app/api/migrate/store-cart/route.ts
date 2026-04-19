import { NextResponse } from 'next/server';
import { authorizeMigrationRequest, buildAdminRlsPolicySql } from '@/lib/migration-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS store_carts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
          session_id TEXT NOT NULL,
          consumer_email TEXT,
          cart_data JSONB DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(merchant_id, session_id)
        );

        CREATE INDEX IF NOT EXISTS idx_store_carts_session ON store_carts(session_id);
        CREATE INDEX IF NOT EXISTS idx_store_carts_merchant ON store_carts(merchant_id);

        ${buildAdminRlsPolicySql('store_carts')}
      `
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
