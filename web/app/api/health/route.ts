import { NextRequest, NextResponse } from "next/server";
import { getHealthPayload, requireApiKey, safeError } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    requireApiKey(request.headers);
    return NextResponse.json(getHealthPayload());
  } catch (error) {
    const { status, message } = safeError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
