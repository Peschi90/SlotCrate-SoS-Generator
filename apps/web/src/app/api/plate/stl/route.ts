import { NextRequest, NextResponse } from "next/server";
import { plateRequestSchema } from "@/lib/schema";
import { requestPlateStl } from "@/lib/cad-client";
import { recordAnalyticsEventSafe } from "@/lib/analytics-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = plateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", details: parsed.error.issues },
      { status: 422 }
    );
  }
  try {
    const blob = await requestPlateStl(parsed.data);
    await recordAnalyticsEventSafe(req, {
      eventType: "plate.download",
      generator: "single-box",
      variantId: parsed.data.suitcaseVariantId,
      details: {
        plateStepFile: parsed.data.plateStepFile
      }
    });
    const stem = parsed.data.plateStepFile.replace(/\.(step|stp)$/i, "");
    const filename = `${parsed.data.suitcaseVariantId}_Rasterplatte_${stem}.stl`;
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "model/stl",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (err) {
    await recordAnalyticsEventSafe(req, {
      eventType: "plate.download.failed",
      generator: "single-box",
      variantId: parsed.data.suitcaseVariantId,
      details: {
        plateStepFile: parsed.data.plateStepFile,
        reason: (err as Error).message.slice(0, 200)
      }
    });
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
