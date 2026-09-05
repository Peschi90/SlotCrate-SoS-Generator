import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { recordAnalyticsEventSafe } from "@/lib/analytics-service";

export const runtime = "nodejs";

const payloadSchema = z.object({
  eventType: z.enum([
    "generator.open",
    "planner.open",
    "generator.variant.change",
    "planner.variant.change",
    "generator.download.click",
    "planner.download.click"
  ]),
  generator: z.enum(["single-box", "layout-planner"]),
  variantId: z.string().min(1).max(64).optional(),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

function sourceKey(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  return `analytics.event:${ip}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!rateLimit(sourceKey(req), 120, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", details: parsed.error.issues }, { status: 422 });
  }

  await recordAnalyticsEventSafe(req, {
    eventType: parsed.data.eventType,
    generator: parsed.data.generator,
    variantId: parsed.data.variantId ?? null,
    details: {
      source: "client",
      ...(parsed.data.details ?? {})
    }
  });

  return NextResponse.json({ ok: true });
}
