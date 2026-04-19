import { NextRequest, NextResponse } from 'next/server';
 
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  void request;
  return NextResponse.json(
    { error: 'Team/staff accounts are disabled in single-merchant mode.' },
    { status: 410 }
  );
}
