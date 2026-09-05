import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAnalyticsSnapshot } from "@/lib/analytics-service";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
  generator: z.enum(["all", "single-box", "layout-planner"]).optional(),
  eventType: z
    .enum([
      "all",
      "generator.open",
      "planner.open",
      "generator.variant.change",
      "planner.variant.change",
      "generator.download.click",
      "planner.download.click",
      "box.download",
      "box.download.failed",
      "layout.download",
      "layout.download.failed"
    ])
    .optional(),
  variantId: z.string().min(1).max(64).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(10).max(250).optional()
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query", details: parsed.error.issues }, { status: 422 });
  }

  const snapshot = await getAnalyticsSnapshot({
    days: parsed.data.days,
    generator: parsed.data.generator,
    eventType: parsed.data.eventType,
    variantId: parsed.data.variantId,
    from: parsed.data.from,
    to: parsed.data.to,
    limit: parsed.data.limit
  });
  return NextResponse.json(snapshot);
}
