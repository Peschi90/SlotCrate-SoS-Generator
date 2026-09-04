import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { verifyCsrfToken } from "@/lib/csrf";
import { getActiveSettings, publishNewSettingsVersion } from "@/lib/settings-service";
import { generatorSettingsPayloadSchema } from "@/lib/generator-settings-schema";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const active = await getActiveSettings();
  return NextResponse.json(active);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let actor;
  try {
    actor = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!rateLimit(`settings.publish:${actor.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsedEnvelope = envelopeSchema.safeParse(raw);
  if (!parsedEnvelope.success) {
    return NextResponse.json({ error: "invalid payload", details: parsedEnvelope.error.issues }, { status: 422 });
  }
  if (!verifyCsrfToken(parsedEnvelope.data.csrfToken)) {
    return NextResponse.json({ error: "invalid csrf" }, { status: 403 });
  }
  const parsedPayload = generatorSettingsPayloadSchema.safeParse(parsedEnvelope.data.payload);
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "invalid settings", details: parsedPayload.error.issues }, { status: 422 });
  }
  const result = await publishNewSettingsVersion(
    actor.id,
    parsedPayload.data,
    parsedEnvelope.data.note
  );
  return NextResponse.json({ ok: true, version: result.version });
}

import { z } from "zod";
const envelopeSchema = z.object({
  csrfToken: z.string(),
  note: z.string().max(255).optional(),
  payload: z.unknown()
});
