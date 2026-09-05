import { NextRequest, NextResponse } from "next/server";
import { layoutRequestSchema } from "@/lib/schema";
import { requestLayoutZip } from "@/lib/cad-client";
import { recordAnalyticsEventSafe } from "@/lib/analytics-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = layoutRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", details: parsed.error.issues },
      { status: 422 }
    );
  }
  try {
    const blob = await requestLayoutZip(parsed.data);
    await recordAnalyticsEventSafe(req, {
      eventType: "layout.download",
      generator: "layout-planner",
      variantId: parsed.data.suitcaseVariantId,
      details: {
        boxes: parsed.data.boxes.length,
        plateStepFile: parsed.data.plateStepFile,
        gridPitchMm: parsed.data.gridPitchMm
      }
    });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="slotcrate_layout.zip"'
      }
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
