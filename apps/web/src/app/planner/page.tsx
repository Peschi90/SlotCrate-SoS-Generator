"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid } from "@/components/LayoutGrid";
import { Layout3DView } from "@/components/Layout3DView";
import { useLayoutStore } from "@/lib/layout-store";
import { SYSTEM } from "@/lib/system";

export default function PlannerPage() {
  const t = useTranslations();
  const boxes = useLayoutStore((s) => s.boxes);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const removeBox = useLayoutStore((s) => s.removeBox);
  const undo = useLayoutStore((s) => s.undo);
  const redo = useLayoutStore((s) => s.redo);
  const reset = useLayoutStore((s) => s.reset);
  const past = useLayoutStore((s) => s.past.length);
  const future = useLayoutStore((s) => s.future.length);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ac, setAc] = useState<AbortController | null>(null);

  const selected = boxes.find((b) => b.id === selectedId) ?? null;
  const usedCells = boxes.reduce((s, b) => s + b.widthCells * b.depthCells, 0);
  const totalCells = SYSTEM.gridColumns * SYSTEM.gridRows;

  async function exportZip() {
    setError(null);
    const controller = new AbortController();
    setAc(controller);
    setDownloading(true);
    try {
      const res = await fetch("/api/layout/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxes }),
        signal: controller.signal
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`${res.status}: ${msg.slice(0, 200)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "slotcrate_layout.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setDownloading(false);
      setAc(null);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 p-6">
      <div className="grid grid-rows-[1fr_1fr] gap-4 min-h-[70vh]">
        <div className="border border-neutral-800 rounded-md overflow-hidden">
          <LayoutGrid />
        </div>
        <div className="border border-neutral-800 rounded-md overflow-hidden">
          <Layout3DView />
        </div>
      </div>

      <aside className="space-y-4 text-sm">
        <h1 className="text-lg font-semibold">{t("planner.title")}</h1>
        <p className="text-neutral-400">{t("planner.description")}</p>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={undo}
            disabled={past === 0}
            className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50"
          >
            {t("planner.undo", { count: past })}
          </button>
          <button
            onClick={redo}
            disabled={future === 0}
            className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50"
          >
            {t("planner.redo", { count: future })}
          </button>
          <button
            onClick={reset}
            disabled={boxes.length === 0}
            className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50"
          >
            {t("planner.reset")}
          </button>
        </div>

        <div className="border-t border-neutral-800 pt-3">
          <div>{t("planner.usedCells", { used: usedCells, total: totalCells })}</div>
          <div>{t("planner.boxCount", { count: boxes.length })}</div>
        </div>

        {selected && (
          <div className="border-t border-neutral-800 pt-3 space-y-1">
            <div>{t("planner.selection")}</div>
            <div>{t("planner.gridSize", { width: selected.widthCells, depth: selected.depthCells })}</div>
            <div>
              {t("planner.outerSize", {
                width: (selected.widthCells * SYSTEM.gridPitchMm).toFixed(2),
                depth: (selected.depthCells * SYSTEM.gridPitchMm).toFixed(2)
              })}
            </div>
            <div>{t("planner.height", { height: selected.heightMm })}</div>
            <button
              onClick={() => removeBox(selected.id)}
              className="mt-2 px-3 py-1.5 rounded bg-red-700 hover:bg-red-600"
            >
              {t("planner.remove")}
            </button>
          </div>
        )}

        <div className="border-t border-neutral-800 pt-3 flex gap-2">
          <button
            onClick={exportZip}
            disabled={boxes.length === 0 || downloading}
            className="px-4 py-2 rounded bg-crate-box hover:brightness-110 disabled:opacity-50"
          >
            {downloading ? t("planner.exporting") : t("planner.exportZip")}
          </button>
          {downloading && (
            <button
              onClick={() => ac?.abort()}
              className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600"
            >
              {t("planner.cancel")}
            </button>
          )}
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
      </aside>
    </div>
  );
}
