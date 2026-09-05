"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GeneratorSettingsPayload } from "@/lib/generator-settings-schema";
import { AdminSettingsForm } from "./AdminSettingsForm";

interface AnalyticsSnapshot {
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
}

export function AdminTabs({
  current,
  analytics
}: {
  current: GeneratorSettingsPayload;
  analytics: AnalyticsSnapshot;
}) {
  const t = useTranslations();
  const [tab, setTab] = useState<"settings" | "analytics">("settings");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
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

      {tab === "settings" ? <AdminSettingsForm current={current} /> : <AnalyticsPanel analytics={analytics} />}
    </div>
  );
}

function AnalyticsPanel({ analytics }: { analytics: AnalyticsSnapshot }) {
  const t = useTranslations();

  return (
    <section className="border border-neutral-800 rounded-md p-4 space-y-4">
      <h2 className="font-semibold">{t("admin.analyticsTitle", { days: analytics.days })}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <StatCard label={t("admin.analytics.totalEvents")} value={String(analytics.totalEvents)} />
        <StatCard label={t("admin.analytics.uniqueVisitors")} value={String(analytics.uniqueVisitors)} />
        <StatCard
          label={t("admin.analytics.downloads")}
          value={String(
            analytics.eventTypes
              .filter((row) => row.eventType === "box.download" || row.eventType === "layout.download")
              .reduce((sum, row) => sum + row.count, 0)
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
