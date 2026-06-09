import { NextRequest, NextResponse } from "next/server";
import { cleanFillersFromPayload, requireApiKey, safeError } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    requireApiKey(request.headers);
    const payload = await request.json();
    const result = await cleanFillersFromPayload(payload);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const { status, message } = safeError(error);
    return NextResponse.json(
      { error: status >= 500 ? "Filler-clean request failed" : message },
      { status },
    );
  }
}
