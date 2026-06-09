import { NextRequest, NextResponse } from "next/server";
import { requireApiKey, safeError, transcribeFromPayload } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    requireApiKey(request.headers);
    const payload = await request.json();
    const result = await transcribeFromPayload(payload);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const { status, message } = safeError(error);
    return NextResponse.json(
      { error: status >= 500 ? "Transcription request failed" : message },
      { status },
    );
  }
}
