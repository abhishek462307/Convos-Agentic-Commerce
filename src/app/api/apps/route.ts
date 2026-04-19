import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Apps marketplace is disabled in single-merchant mode." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Apps marketplace is disabled in single-merchant mode." },
    { status: 410 }
  );
}
