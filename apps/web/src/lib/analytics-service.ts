import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { sessionCookieName } from "./session";

export type AnalyticsGenerator = "single-box" | "layout-planner";
export type AnalyticsEventType =
  | "generator.open"
  | "planner.open"
  | "generator.variant.change"
  | "planner.variant.change"
  | "generator.download.click"
  | "planner.download.click"
  | "box.download"
  | "box.download.failed"
  | "plate.download.click"
  | "plate.download"
  | "plate.download.failed"
  | "layout.download"
  | "layout.download.failed";

export interface AnalyticsEventInput {
  eventType: AnalyticsEventType;
  generator: AnalyticsGenerator;
  variantId?: string | null;
  details?: Prisma.InputJsonValue | null;
}

export interface AnalyticsFilters {
  days?: number;
  generator?: AnalyticsGenerator | "all";
  eventType?: AnalyticsEventType | "all";
  variantId?: string | "all";
  from?: string;
  to?: string;
  limit?: number;
}

export interface AnalyticsSnapshot {
  days: number;
  filters: {
    generator: string;
    eventType: string;
    variantId: string;
    from: string | null;
    to: string | null;
    limit: number;
  };
  totalEvents: number;
  uniqueVisitors: number;
  opens: number;
  downloadClicks: number;
  successfulDownloads: number;
  failedDownloads: number;
  conversionRatePercent: number;
  avgBoxesPerLayoutDownload: number;
  generatorUsage: Array<{ generator: string; count: number }>;
  eventTypes: Array<{ eventType: string; count: number }>;
  topVariants: Array<{ variantId: string; count: number }>;
  topBoxSizes: Array<{ size: string; count: number }>;
  dailySeries: Array<{ date: string; total: number; opens: number; downloads: number }>;
  availableGenerators: string[];
  availableEventTypes: string[];
  availableVariants: string[];
  recentEvents: Array<{
    id: string;
    createdAt: string;
    eventType: string;
    generator: string;
    variantId: string | null;
    details: unknown;
  }>;
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

function clampDays(days: number | undefined): number {
  if (!days || !Number.isFinite(days)) return 30;
  return Math.max(1, Math.min(365, Math.round(days)));
}

function asDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getAnalyticsSnapshot(filters: AnalyticsFilters | number = 30): Promise<AnalyticsSnapshot> {
  const cfg: AnalyticsFilters = typeof filters === "number" ? { days: filters } : filters;
  const days = clampDays(cfg.days);
  const fallbackFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const fromDate = asDate(cfg.from) ?? fallbackFrom;
  const toDate = asDate(cfg.to);
  const limit = Math.max(10, Math.min(250, Math.round(cfg.limit ?? 100)));

  const whereBase: Prisma.GeneratorAnalyticsEventWhereInput = {
    createdAt: {
      gte: fromDate,
      lte: toDate ?? undefined
    }
  };
  if (cfg.generator && cfg.generator !== "all") whereBase.generator = cfg.generator;
  if (cfg.eventType && cfg.eventType !== "all") whereBase.eventType = cfg.eventType;
  if (cfg.variantId && cfg.variantId !== "all") whereBase.variantId = cfg.variantId;

  const globalSince = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const [
    totalEvents,
    visitorRows,
    usageRows,
    eventRows,
    variantRows,
    recentRows,
    allRows,
    generatorFacetRows,
    eventFacetRows,
    variantFacetRows
  ] = await Promise.all([
    prisma.generatorAnalyticsEvent.count({ where: whereBase }),
    prisma.generatorAnalyticsEvent.findMany({
      where: { ...whereBase, visitorHash: { not: null } },
      distinct: ["visitorHash"],
      select: { visitorHash: true }
    }),
    prisma.generatorAnalyticsEvent.groupBy({
      by: ["generator"],
      where: whereBase,
      _count: { _all: true }
    }),
    prisma.generatorAnalyticsEvent.groupBy({
      by: ["eventType"],
      where: whereBase,
      _count: { _all: true }
    }),
    prisma.generatorAnalyticsEvent.groupBy({
      by: ["variantId"],
      where: { ...whereBase, variantId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { variantId: "desc" } },
      take: 12
    }),
    prisma.generatorAnalyticsEvent.findMany({
      where: whereBase,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        eventType: true,
        generator: true,
        variantId: true,
        details: true
      }
    }),
    prisma.generatorAnalyticsEvent.findMany({
      where: whereBase,
      orderBy: { createdAt: "asc" },
      take: 10000,
      select: {
        createdAt: true,
        eventType: true,
        details: true,
        variantId: true
      }
    }),
    prisma.generatorAnalyticsEvent.groupBy({
      by: ["generator"],
      where: { createdAt: { gte: globalSince } },
      _count: { _all: true }
    }),
    prisma.generatorAnalyticsEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: globalSince } },
      _count: { _all: true }
    }),
    prisma.generatorAnalyticsEvent.groupBy({
      by: ["variantId"],
      where: { createdAt: { gte: globalSince }, variantId: { not: null } },
      _count: { _all: true }
    })
  ]);

  const opens = allRows.filter((row) => row.eventType === "generator.open" || row.eventType === "planner.open").length;
  const downloadClicks = allRows.filter((row) => row.eventType === "generator.download.click" || row.eventType === "planner.download.click").length;
  const successfulDownloads = allRows.filter((row) => row.eventType === "box.download" || row.eventType === "layout.download").length;
  const failedDownloads = allRows.filter((row) => row.eventType === "box.download.failed" || row.eventType === "layout.download.failed").length;

  const dailyMap = new Map<string, { total: number; opens: number; downloads: number }>();
  const boxSizeMap = new Map<string, number>();
  let layoutCount = 0;
  let layoutBoxSum = 0;

  for (const row of allRows) {
    const date = row.createdAt.toISOString().slice(0, 10);
    const bucket = dailyMap.get(date) ?? { total: 0, opens: 0, downloads: 0 };
    bucket.total += 1;
    if (row.eventType === "generator.open" || row.eventType === "planner.open") bucket.opens += 1;
    if (row.eventType === "box.download" || row.eventType === "layout.download") bucket.downloads += 1;
    dailyMap.set(date, bucket);

    if (row.eventType === "box.download" && isObject(row.details)) {
      const w = Number(row.details.widthCells ?? 0);
      const d = Number(row.details.depthCells ?? 0);
      const h = Number(row.details.heightMm ?? 0);
      if (Number.isFinite(w) && Number.isFinite(d) && Number.isFinite(h) && w > 0 && d > 0) {
        const key = `${w}x${d} H${h.toFixed(1)}`;
        boxSizeMap.set(key, (boxSizeMap.get(key) ?? 0) + 1);
      }
    }
    if (row.eventType === "layout.download" && isObject(row.details)) {
      const boxes = Number(row.details.boxes ?? 0);
      if (Number.isFinite(boxes) && boxes >= 0) {
        layoutCount += 1;
        layoutBoxSum += boxes;
      }
    }
  }

  const dailySeries = [...dailyMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, v]) => ({ date, total: v.total, opens: v.opens, downloads: v.downloads }));

  const topBoxSizes = [...boxSizeMap.entries()]
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    days,
    filters: {
      generator: cfg.generator ?? "all",
      eventType: cfg.eventType ?? "all",
      variantId: cfg.variantId ?? "all",
      from: cfg.from ?? null,
      to: cfg.to ?? null,
      limit
    },
    totalEvents,
    uniqueVisitors: visitorRows.length,
    opens,
    downloadClicks,
    successfulDownloads,
    failedDownloads,
    conversionRatePercent: opens > 0 ? Number(((successfulDownloads / opens) * 100).toFixed(2)) : 0,
    avgBoxesPerLayoutDownload: layoutCount > 0 ? Number((layoutBoxSum / layoutCount).toFixed(2)) : 0,
    generatorUsage: usageRows
      .map((row) => ({ generator: row.generator, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    eventTypes: eventRows
      .map((row) => ({ eventType: row.eventType, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    topVariants: variantRows
      .filter((row) => row.variantId)
      .map((row) => ({ variantId: row.variantId as string, count: row._count._all })),
    topBoxSizes,
    dailySeries,
    availableGenerators: generatorFacetRows.map((row) => row.generator).sort(),
    availableEventTypes: eventFacetRows.map((row) => row.eventType).sort(),
    availableVariants: variantFacetRows
      .map((row) => row.variantId)
      .filter((v): v is string => typeof v === "string")
      .sort(),
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
