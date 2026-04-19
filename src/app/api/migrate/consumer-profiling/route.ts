import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: 'Cross-store consumer profiling migration is disabled in single-merchant mode.' },
    { status: 410 }
  );
}
