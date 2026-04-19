import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    error: 'The missions system has been removed.',
  }, { status: 410 });
}
