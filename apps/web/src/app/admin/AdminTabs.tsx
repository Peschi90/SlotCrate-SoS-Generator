"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { GeneratorSettingsPayload } from "@/lib/generator-settings-schema";
import { AdminSettingsForm } from "./AdminSettingsForm";

interface AnalyticsSnapshot {
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

export function AdminTabs({
  current,
  analytics: initialAnalytics
}: {
  current: GeneratorSettingsPayload;
  analytics: AnalyticsSnapshot;
}) {
  const t = useTranslations();
  const [tab, setTab] = useState<"settings" | "analytics">("settings");
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot>(initialAnalytics);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [days, setDays] = useState(String(initialAnalytics.days));
  const [generator, setGenerator] = useState(initialAnalytics.filters.generator ?? "all");
  const [eventType, setEventType] = useState(initialAnalytics.filters.eventType ?? "all");
  const [variantId, setVariantId] = useState(initialAnalytics.filters.variantId ?? "all");
  const [from, setFrom] = useState(initialAnalytics.filters.from ?? "");
  const [to, setTo] = useState(initialAnalytics.filters.to ?? "");
  const [limit, setLimit] = useState(String(initialAnalytics.filters.limit ?? 100));

  async function reloadAnalytics() {
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const params = new URLSearchParams();
      params.set("days", days);
      params.set("generator", generator);
      params.set("eventType", eventType);
      if (variantId && variantId !== "all") params.set("variantId", variantId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("limit", limit);
      const res = await fetch(`/api/admin/analytics?${params.toString()}`, { method: "GET" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as AnalyticsSnapshot;
      setAnalytics(json);
    } catch (err: unknown) {
      setAnalyticsError((err as Error).message);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  function resetFilters() {
    setDays("30");
    setGenerator("all");
    setEventType("all");
    setVariantId("all");
    setFrom("");
    setTo("");
    setLimit("100");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("settings")}
          className={[
            "px-3 py-1.5 rounded border",
            tab === "settings"
              ? "border-crate-box bg-crate-box/15"
              : "border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
          ].join(" ")}
        >
          {t("admin.tab.settings")}
        </button>
        <button
          type="button"
          onClick={() => setTab("analytics")}
          className={[
            "px-3 py-1.5 rounded border",
            tab === "analytics"
              ? "border-crate-box bg-crate-box/15"
              : "border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
          ].join(" ")}
        >
          {t("admin.tab.analytics")}
        </button>
      </div>

      {tab === "settings" ? (
        <AdminSettingsForm current={current} />
      ) : (
        <AnalyticsPanel
          analytics={analytics}
          loading={loadingAnalytics}
          error={analyticsError}
          filters={{ days, generator, eventType, variantId, from, to, limit }}
          onDays={setDays}
          onGenerator={setGenerator}
          onEventType={setEventType}
          onVariant={setVariantId}
          onFrom={setFrom}
          onTo={setTo}
          onLimit={setLimit}
          onApply={reloadAnalytics}
          onReset={resetFilters}
        />
      )}
    </div>
  );
}

function AnalyticsPanel({
  analytics,
  loading,
  error,
  filters,
  onDays,
  onGenerator,
  onEventType,
  onVariant,
  onFrom,
  onTo,
  onLimit,
  onApply,
  onReset
}: {
  analytics: AnalyticsSnapshot;
  loading: boolean;
  error: string | null;
  filters: {
    days: string;
    generator: string;
    eventType: string;
    variantId: string;
    from: string;
    to: string;
    limit: string;
  };
  onDays(v: string): void;
  onGenerator(v: string): void;
  onEventType(v: string): void;
  onVariant(v: string): void;
  onFrom(v: string): void;
  onTo(v: string): void;
  onLimit(v: string): void;
  onApply(): Promise<void>;
  onReset(): void;
}) {
  const t = useTranslations();
  const maxSeries = useMemo(() => {
    return analytics.dailySeries.reduce((m, row) => Math.max(m, row.total), 1);
  }, [analytics.dailySeries]);

  const filterOptions = {
    generators: ["all", ...analytics.availableGenerators],
    eventTypes: ["all", ...analytics.availableEventTypes],
    variants: ["all", ...analytics.availableVariants]
  };

  return (
    <section className="border border-neutral-800 rounded-md p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t("admin.analyticsTitle", { days: analytics.days })}</h2>
        <div className="text-xs text-neutral-400">{loading ? "Loading..." : ""}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-2 text-sm">
        <Field label="Days">
          <input value={filters.days} onChange={(e) => onDays(e.target.value)} type="number" min={1} max={365} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5" />
        </Field>
        <Field label="Generator">
          <select value={filters.generator} onChange={(e) => onGenerator(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5">
            {filterOptions.generators.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Event">
          <select value={filters.eventType} onChange={(e) => onEventType(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5">
            {filterOptions.eventTypes.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Variant">
          <select value={filters.variantId} onChange={(e) => onVariant(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5">
            {filterOptions.variants.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="From">
          <input value={filters.from} onChange={(e) => onFrom(e.target.value)} type="date" className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5" />
        </Field>
        <Field label="To">
          <input value={filters.to} onChange={(e) => onTo(e.target.value)} type="date" className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5" />
        </Field>
        <Field label="Rows">
          <input value={filters.limit} onChange={(e) => onLimit(e.target.value)} type="number" min={10} max={250} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5" />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => void onApply()} className="px-3 py-1.5 rounded bg-crate-box text-neutral-950 font-medium hover:brightness-110">Apply filters</button>
        <button onClick={onReset} className="px-3 py-1.5 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800">Reset</button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 text-sm">
        <StatCard label={t("admin.analytics.totalEvents")} value={String(analytics.totalEvents)} />
        <StatCard label={t("admin.analytics.uniqueVisitors")} value={String(analytics.uniqueVisitors)} />
        <StatCard label={t("admin.analytics.opens")} value={String(analytics.opens)} />
        <StatCard label={t("admin.analytics.downloadClicks")} value={String(analytics.downloadClicks)} />
        <StatCard label={t("admin.analytics.downloads")} value={String(analytics.successfulDownloads)} />
        <StatCard label={t("admin.analytics.failedDownloads")} value={String(analytics.failedDownloads)} />
        <StatCard label={t("admin.analytics.conversionRate")} value={`${analytics.conversionRatePercent}%`} />
        <StatCard label={t("admin.analytics.avgBoxesPerLayout")} value={String(analytics.avgBoxesPerLayoutDownload)} />
      </div>

      <div className="rounded border border-neutral-800 p-3">
        <h3 className="font-medium mb-3">{t("admin.analytics.dailyChart")}</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[780px] h-44 flex items-end gap-1">
            {analytics.dailySeries.map((row) => {
              const h = Math.max(4, Math.round((row.total / maxSeries) * 140));
              return (
                <div key={row.date} className="group flex-1 min-w-[16px]">
                  <div className="rounded-t bg-crate-box/80 hover:bg-crate-box transition-colors" style={{ height: `${h}px` }} />
                  <div className="text-[10px] text-neutral-500 mt-1 rotate-[-35deg] origin-top-left whitespace-nowrap">
                    {row.date.slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
        <SimpleList
          title={t("admin.analytics.byGenerator")}
          rows={analytics.generatorUsage.map((row) => ({ key: row.generator, value: row.count }))}
        />
        <SimpleList
          title={t("admin.analytics.byEvent")}
          rows={analytics.eventTypes.map((row) => ({ key: row.eventType, value: row.count }))}
        />
        <SimpleList
          title={t("admin.analytics.topVariants")}
          rows={analytics.topVariants.map((row) => ({ key: row.variantId, value: row.count }))}
        />
        <SimpleList
          title={t("admin.analytics.topBoxSizes")}
          rows={analytics.topBoxSizes.map((row) => ({ key: row.size, value: row.count }))}
        />
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">{t("admin.analytics.recentEvents")}</h3>
        <div className="overflow-auto border border-neutral-800 rounded">
          <table className="w-full text-xs">
            <thead className="bg-neutral-900">
              <tr>
                <th className="text-left p-2">{t("admin.analytics.colTime")}</th>
                <th className="text-left p-2">{t("admin.analytics.colGenerator")}</th>
                <th className="text-left p-2">{t("admin.analytics.colEvent")}</th>
                <th className="text-left p-2">{t("admin.analytics.colVariant")}</th>
                <th className="text-left p-2">{t("admin.analytics.colDetails")}</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentEvents.map((row) => (
                <tr key={row.id} className="border-t border-neutral-800 align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(row.createdAt).toISOString().replace("T", " ").slice(0, 19)}Z</td>
                  <td className="p-2 whitespace-nowrap">{row.generator}</td>
                  <td className="p-2 whitespace-nowrap">{row.eventType}</td>
                  <td className="p-2 whitespace-nowrap">{row.variantId ?? "-"}</td>
                  <td className="p-2">
                    <pre className="whitespace-pre-wrap break-words text-[11px] text-neutral-300">{JSON.stringify(row.details ?? {}, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-neutral-300 space-y-1">
      <span className="block">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900 px-3 py-2">
      <div className="text-neutral-400 text-xs">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function SimpleList({
  title,
  rows
}: {
  title: string;
  rows: Array<{ key: string; value: number }>;
}) {
  return (
    <div className="rounded border border-neutral-800 p-3">
      <h3 className="font-medium mb-2">{title}</h3>
      <ul className="space-y-1 text-neutral-300">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-2">
            <span>{row.key}</span>
            <span>{row.value}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-neutral-500">-</li>}
      </ul>
    </div>
  );
}
