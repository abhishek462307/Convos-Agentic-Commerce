import { NextResponse } from 'next/server';
import { authorizeMigrationRequest } from '@/lib/migration-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `UPDATE products SET search_text = to_tsvector('english', coalesce(name,'') || ' ' || coalesce(category,'') || ' ' || coalesce(description,'')) WHERE search_text IS NULL`
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Backfill complete', result: data });
  } catch (error: any) {
    logger.error('Backfill error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
