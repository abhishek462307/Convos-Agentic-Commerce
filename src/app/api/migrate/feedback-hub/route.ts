import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { authorizeMigrationRequest } from '@/lib/migration-auth';

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    await supabase.rpc('exec_sql', {
      sql_query: `CREATE TABLE IF NOT EXISTS changelog (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        title text NOT NULL,
        description text NOT NULL,
        type text NOT NULL DEFAULT 'improvement' CHECK (type IN ('feature', 'improvement', 'fix', 'announcement')),
        created_at timestamptz DEFAULT now()
      )`
    });

    await supabase.rpc('exec_sql', {
      sql_query: `CREATE TABLE IF NOT EXISTS feature_requests (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'planned', 'in_progress', 'completed', 'declined')),
        upvotes integer DEFAULT 0,
        created_at timestamptz DEFAULT now()
      )`
    });

    await supabase.rpc('exec_sql', {
      sql_query: `CREATE TABLE IF NOT EXISTS feature_request_votes (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        feature_request_id uuid REFERENCES feature_requests(id) ON DELETE CASCADE NOT NULL,
        user_id uuid NOT NULL,
        created_at timestamptz DEFAULT now(),
        UNIQUE(feature_request_id, user_id)
      )`
    });

    await supabase.rpc('exec_sql', {
      sql_query: `CREATE TABLE IF NOT EXISTS bug_reports (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'fixed', 'wont_fix')),
        created_at timestamptz DEFAULT now()
      )`
    });

    const { data: existing } = await supabase.from('changelog').select('id').limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from('changelog').insert([
        { title: 'AI Voice Shopping', description: 'Added real-time voice AI for conversational shopping experiences.', type: 'feature' },
        { title: 'Faster Store Loading', description: 'Optimized storefront loading speed by 40%.', type: 'improvement' },
        { title: 'Checkout Bug Fix', description: 'Fixed issue where discount codes were not applying correctly.', type: 'fix' },
        { title: 'Platform Launch', description: 'Welcome to Convos! Your AI-powered conversational commerce platform is live.', type: 'announcement' },
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
