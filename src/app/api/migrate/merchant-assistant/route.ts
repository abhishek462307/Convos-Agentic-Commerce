import { NextResponse } from 'next/server';
import {
  authorizeMerchantAssistantMigration,
  ensureMerchantAssistantSchema,
  MERCHANT_ASSISTANT_SCHEMA_STATEMENTS,
} from '@/lib/merchant-assistant-schema';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const auth = await authorizeMerchantAssistantMigration(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const results: Record<string, string> = {};

  for (const statement of MERCHANT_ASSISTANT_SCHEMA_STATEMENTS) {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: statement.sql });
    results[statement.name] = error ? `ERROR: ${error.message}` : 'OK';
  }

  const hasFailures = Object.values(results).some((value) => value.startsWith('ERROR:'));
  if (hasFailures) {
    return NextResponse.json({ success: false, results }, { status: 500 });
  }

  await ensureMerchantAssistantSchema();
  return NextResponse.json({ success: true, results });
}
