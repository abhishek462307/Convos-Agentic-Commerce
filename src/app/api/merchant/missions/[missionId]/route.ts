import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    error: 'The missions system has been removed.',
  }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({
    error: 'The missions system has been removed.',
  }, { status: 410 });
}
