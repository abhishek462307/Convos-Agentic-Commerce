import { NextResponse } from 'next/server';

function buildRemovedResponse() {
  return NextResponse.json({
    success: true,
    merchantsProcessed: 0,
    missionsCreated: 0,
    message: 'Agentic mission triggers are disabled because the missions system has been removed.',
  });
}

export async function GET() {
  return buildRemovedResponse();
}

export async function POST() {
  return buildRemovedResponse();
}
