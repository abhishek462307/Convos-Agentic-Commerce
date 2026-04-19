import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Apps marketplace is disabled in single-merchant mode." },
    { status: 410 }
  );
}
