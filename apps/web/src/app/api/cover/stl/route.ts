import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEventSafe } from "@/lib/analytics-service";
import { requestCoverStl } from "@/lib/cad-client";
import { coverRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = coverRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", details: parsed.error.issues }, { status: 422 });
  }
  try {
    const blob = await requestCoverStl(parsed.data);
    await recordAnalyticsEventSafe(req, {
      eventType: "cover.download",
      generator: "cover-generator",
      details: { textLength: parsed.data.text.length, fontSizeMm: parsed.data.fontSizeMm }
    });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "model/stl",
        "Content-Disposition": 'attachment; filename="SlotCrate_SM_Cover.stl"'
      }
    });
  } catch (err) {
    await recordAnalyticsEventSafe(req, {
      eventType: "cover.download.failed",
      generator: "cover-generator",
      details: { reason: (err as Error).message.slice(0, 200) }
    });
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}