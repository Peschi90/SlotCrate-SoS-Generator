import { NextRequest, NextResponse } from "next/server";
import { inlayRequestSchema } from "@/lib/schema";
import { requestInlayStl } from "@/lib/cad-client";
import { recordAnalyticsEventSafe } from "@/lib/analytics-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = inlayRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", details: parsed.error.issues }, { status: 422 });
  }
  try {
    const blob = await requestInlayStl(parsed.data);
    await recordAnalyticsEventSafe(req, {
      eventType: "inlay.download",
      generator: "maintenance-inlay",
      details: {
        level1Count: parsed.data.level1Cutouts.length,
        level2Count: parsed.data.level2Cutouts.length
      }
    });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "model/stl",
        "Content-Disposition": 'attachment; filename="SlotCrate_MM_Inlay.stl"'
      }
    });
  } catch (err) {
    await recordAnalyticsEventSafe(req, {
      eventType: "inlay.download.failed",
      generator: "maintenance-inlay",
      details: {
        reason: (err as Error).message.slice(0, 200)
      }
    });
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
