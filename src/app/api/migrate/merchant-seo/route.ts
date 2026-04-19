
import { NextResponse } from 'next/server';
import { authorizeMigrationRequest } from '@/lib/migration-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  const auth = await authorizeMigrationRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: check, error: checkError } = await supabaseAdmin
      .from('merchants')
      .select('google_search_console_id, bing_verification_id')
      .limit(1);

    if (checkError && checkError.code === '42703') { // Undefined column
      return NextResponse.json({ 
        error: 'Missing GSC columns in merchants table. Please run the migration SQL in your Supabase Dashboard.',
        sql: `
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_search_console_id TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bing_verification_id TEXT;
        `
      }, { status: 500 });
    }

    return NextResponse.json({ message: 'Merchant SEO columns ready' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
