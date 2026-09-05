import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { sessionCookieName } from "./session";

export type AnalyticsGenerator = "single-box" | "layout-planner";
export type AnalyticsEventType =
  | "generator.open"
  | "planner.open"
  | "box.download"
  | "layout.download";

export interface AnalyticsEventInput {
  eventType: AnalyticsEventType;
  generator: AnalyticsGenerator;
  variantId?: string | null;
  details?: Prisma.InputJsonValue | null;
}

function analyticsSecret(): string {
  const s = process.env.ANALYTICS_SECRET ?? process.env.SESSION_SECRET;
  if (s && s.length >= 24) return s;
  if (process.env.NODE_ENV !== "production") {
    return "slotcrate-dev-analytics-secret-slotcrate-dev";
  }
  throw new Error("ANALYTICS_SECRET oder SESSION_SECRET fehlt");
}

function secureHash(value: string): string {
  return createHmac("sha256", analyticsSecret()).update(value).digest("hex");
}

function normalizeIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  return real || null;
}

export async function recordAnalyticsEvent(req: NextRequest, event: AnalyticsEventInput): Promise<void> {
  const ip = normalizeIp(req);
  const userAgent = req.headers.get("user-agent")?.slice(0, 255) ?? null;
  const sessionToken = req.cookies.get(sessionCookieName())?.value ?? null;

  const ipHash = ip ? secureHash(`ip:${ip}`) : null;
  const sessionHash = sessionToken ? secureHash(`session:${sessionToken}`) : null;
  const visitorBasis = `${ip ?? "no-ip"}|${userAgent ?? "no-ua"}`;
  const visitorHash = secureHash(`visitor:${visitorBasis}`);

  await prisma.generatorAnalyticsEvent.create({
    data: {
      eventType: event.eventType,
      generator: event.generator,
      variantId: event.variantId?.slice(0, 64) ?? null,
      sessionHash,
      visitorHash,
      ipHash,
      userAgent,
      details: event.details ?? Prisma.JsonNull
    }
  });
}

export async function recordAnalyticsEventSafe(req: NextRequest, event: AnalyticsEventInput): Promise<void> {
  try {
    await recordAnalyticsEvent(req, event);
  } catch {
    // Analytics darf den User-Flow nicht blockieren.
  }
}

export async function getAnalyticsSnapshot(days: number = 30): Promise<{
  days: number;
  totalEvents: number;
  uniqueVisitors: number;
  generatorUsage: Array<{ generator: string; count: number }>;
  eventTypes: Array<{ eventType: string; count: number }>;
  topVariants: Array<{ variantId: string; count: number }>;
  recentEvents: Array<{
    id: string;
    createdAt: string;
    eventType: string;
    generator: string;
    variantId: string | null;
    details: unknown;
  }>;
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totalEvents, visitorRows, usageRows, eventRows, variantRows, recentRows] = await Promise.all([
    prisma.generatorAnalyticsEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.generatorAnalyticsEvent.findMany({
      where: { createdAt: { gte: since }, visitorHash: { not: null } },
      distinct: ["visitorHash"],
      select: { visitorHash: true }
    }),
    prisma.generatorAnalyticsEvent.groupBy({
      by: ["generator"],
      where: { createdAt: { gte: since } },
      _count: { _all: true }
    }),
    prisma.generatorAnalyticsEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: since } },
      _count: { _all: true }
    }),
    prisma.generatorAnalyticsEvent.groupBy({
      by: ["variantId"],
      where: { createdAt: { gte: since }, variantId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { variantId: "desc" } },
      take: 8
    }),
    prisma.generatorAnalyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        eventType: true,
        generator: true,
        variantId: true,
        details: true
      }
    })
  ]);

  return {
    days,
    totalEvents,
    uniqueVisitors: visitorRows.length,
    generatorUsage: usageRows
      .map((row) => ({ generator: row.generator, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    eventTypes: eventRows
      .map((row) => ({ eventType: row.eventType, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    topVariants: variantRows
      .filter((row) => row.variantId)
      .map((row) => ({ variantId: row.variantId as string, count: row._count._all })),
    recentEvents: recentRows.map((row) => ({
      id: row.id.toString(),
      createdAt: row.createdAt.toISOString(),
      eventType: row.eventType,
      generator: row.generator,
      variantId: row.variantId,
      details: row.details
    }))
  };
}
