import { NextResponse } from 'next/server';
import { authorizeMigrationRequest } from '@/lib/migration-auth';

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const sql = `
-- Add BYOK (Bring Your Own Key) fields to merchants table
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openai';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ai_api_key TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ai_model TEXT;
  `;

  return NextResponse.json({ 
    success: true, 
    message: 'Copy and run this SQL in Supabase Dashboard → SQL Editor',
    sql
  });
}

export async function GET(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({ 
    message: 'POST to this endpoint to get the BYOK migration SQL',
    instructions: 'Copy the SQL from the response and run it in Supabase Dashboard → SQL Editor'
  });
}
