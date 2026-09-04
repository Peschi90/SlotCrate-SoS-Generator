import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { verifyCsrfToken } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
  csrfToken: z.string().min(1)
});

function ipKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = ipKey(req);
  if (!rateLimit(`login:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 422 });
  if (!verifyCsrfToken(parsed.data.csrfToken)) {
    return NextResponse.json({ error: "invalid csrf" }, { status: 403 });
  }
  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result) return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  await createSession(result.id, {
    userAgent: req.headers.get("user-agent"),
    ipHash: ip
  });
  return NextResponse.json({ ok: true, role: result.role });
}
