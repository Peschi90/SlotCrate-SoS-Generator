import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { layoutDraftSchema } from "@/lib/layout-draft";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const DEFAULT_TTL_DAYS = 90;
const MAX_TTL_DAYS = 365;

function ttlDays(): number {
  const raw = process.env.SHARE_LAYOUT_TTL_DAYS;
  if (!raw) return DEFAULT_TTL_DAYS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL_DAYS;
  return Math.min(MAX_TTL_DAYS, n);
}

function rateLimitPerMin(): number {
  const raw = process.env.RATE_LIMIT_LAYOUT_SHARE;
  if (!raw) return 10;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return n;
}

function normalizeIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || null;
}

function hashIp(ip: string): string {
  const secret = process.env.SESSION_SECRET || process.env.ANALYTICS_SECRET || "slotcrate-dev-share-secret";
  return createHmac("sha256", secret).update(`share-ip:${ip}`).digest("hex");
}

function makeShortId(): string {
  // 9 Bytes → 12 Zeichen base64url, url-sicher, keine Sonderzeichen.
  return randomBytes(9).toString("base64url");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = normalizeIp(req);
  const bucketKey = `layout-share:${ip ?? "anon"}`;
  if (!rateLimit(bucketKey, rateLimitPerMin(), 60_000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = layoutDraftSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays() * 24 * 60 * 60 * 1000);

  // Sehr klein — 3 Kollisionsversuche reichen bei 12-Zeichen-IDs weit aus.
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = makeShortId();
    try {
      await prisma.sharedLayout.create({
        data: {
          id,
          payload: parsed.data as unknown as Prisma.InputJsonValue,
          expiresAt,
          createdIpHash: ip ? hashIp(ip) : null
        }
      });
      return NextResponse.json(
        {
          id,
          expiresAt: expiresAt.toISOString(),
          ttlDays: ttlDays()
        },
        { status: 201 }
      );
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002") continue; // Unique-Kollision → neuer Versuch
      return NextResponse.json({ error: "SHARE_STORE_FAILED" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "SHARE_ID_COLLISION" }, { status: 500 });
}
