import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    processed: 0,
    message: 'Mission processing is disabled because the missions system has been removed.',
  });
}
