import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Migration endpoint disabled in single-merchant mode.' },
    { status: 410 }
  );
}
