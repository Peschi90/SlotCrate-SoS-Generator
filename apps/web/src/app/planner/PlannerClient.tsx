"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid } from "@/components/LayoutGrid";
import { Layout3DView } from "@/components/Layout3DView";
import { PlannerPersistencePanel } from "@/components/PlannerPersistencePanel";
import { useLayoutStore } from "@/lib/layout-store";
import { analyzeFreeCells, planFillLargest, planFillWithSize } from "@/lib/layout-fill";
import { SYSTEM } from "@/lib/system";
import type { GeneratorSettingsPayload } from "@/lib/generator-settings-schema";

type SuitcaseVariant = GeneratorSettingsPayload["suitcaseVariants"][number];

const DRAWER_HEIGHT_PRESETS = [20, 40, 60, 80] as const;

export function PlannerClient({
  variants,
  defaultHeightMm
}: {
  variants: SuitcaseVariant[];
  defaultHeightMm: number;
}) {
  const t = useTranslations();
  const boxes = useLayoutStore((s) => s.boxes);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const selectedIds = useLayoutStore((s) => s.selectedIds);
  const removeBox = useLayoutStore((s) => s.removeBox);
  const removeSelected = useLayoutStore((s) => s.removeSelected);
  const duplicateSelected = useLayoutStore((s) => s.duplicateSelected);
  const rotateSelected = useLayoutStore((s) => s.rotateSelected);
  const resizeBox = useLayoutStore((s) => s.resizeBox);
  const setBoxHeight = useLayoutStore((s) => s.setBoxHeight);
  const clearSelection = useLayoutStore((s) => s.clearSelection);
  const applyFillPlan = useLayoutStore((s) => s.applyFillPlan);
  const undo = useLayoutStore((s) => s.undo);
  const redo = useLayoutStore((s) => s.redo);
  const reset = useLayoutStore((s) => s.reset);
  const past = useLayoutStore((s) => s.past.length);
  const future = useLayoutStore((s) => s.future.length);
  const selectedHeightMm = useLayoutStore((s) => s.selectedHeightMm);
  const setHeightMm = useLayoutStore((s) => s.setHeightMm);

  const [variantId, setVariantId] = useState(variants[0]?.id ?? "sc-124-v2");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ac, setAc] = useState<AbortController | null>(null);
  const [highlightFree, setHighlightFree] = useState(false);
  const [preferredFillSize, setPreferredFillSize] = useState<string>("2x2");

  const activeVariant = variants.find((variant) => variant.id === variantId) ?? variants[0]!;
  const pitchMm = activeVariant.gridPitchMm;
  const selected = boxes.find((b) => b.id === selectedId) ?? null;
  const selectedBoxes = useMemo(
    () => boxes.filter((b) => selectedIds.includes(b.id)),
    [boxes, selectedIds]
  );
  const usedCells = boxes.reduce((s, b) => s + b.widthCells * b.depthCells, 0);
  const totalCells = SYSTEM.gridColumns * SYSTEM.gridRows;
  const freeReport = useMemo(() => analyzeFreeCells(boxes, 2), [boxes]);
  const fillSizeOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; w: number; d: number }> = [];
    const maxW = activeVariant.maxWidthCells;
    const maxD = activeVariant.maxDepthCells;
    for (const [w, d] of [
      [1, 1],
      [2, 2],
      [3, 3],
      [2, 1],
      [3, 2],
      [4, 2],
      [4, 4],
      [5, 5]
    ] as const) {
      if (w <= maxW && d <= maxD) opts.push({ value: `${w}x${d}`, label: `${w}×${d}`, w, d });
    }
    return opts;
  }, [activeVariant.maxWidthCells, activeVariant.maxDepthCells]);
  const preferredFill = useMemo(() => {
    const found = fillSizeOptions.find((o) => o.value === preferredFillSize);
    return found ?? fillSizeOptions[0]!;
  }, [fillSizeOptions, preferredFillSize]);

  async function trackEvent(eventType: string, details?: Record<string, string | number | boolean | null>) {
    try {
      await fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          generator: "layout-planner",
          variantId: activeVariant.id,
          details: details ?? {}
        })
      });
    } catch {
      // fire-and-forget
    }
  }

  useEffect(() => {
    const preferred = activeVariant?.boxHeightMm ?? defaultHeightMm;
    setHeightMm(preferred);
  }, [activeVariant?.id, activeVariant?.boxHeightMm, defaultHeightMm, setHeightMm]);

  useEffect(() => {
    void trackEvent("planner.open");
  }, [activeVariant.id]);

  const selectedPreset = useMemo(() => {
    let best: (typeof DRAWER_HEIGHT_PRESETS)[number] = DRAWER_HEIGHT_PRESETS[0];
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const preset of DRAWER_HEIGHT_PRESETS) {
      const delta = Math.abs(selectedHeightMm - mapDrawerHeightToBoxHeight(preset));
      if (delta < bestDelta) {
        best = preset;
        bestDelta = delta;
      }
    }
    return best;
  }, [selectedHeightMm]);

  async function exportZip() {
    setError(null);
    void trackEvent("planner.download.click", { boxes: boxes.length });
    const controller = new AbortController();
    setAc(controller);
    setDownloading(true);
    try {
      const res = await fetch("/api/layout/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boxes,
          suitcaseVariantId: activeVariant.id,
          plateStepFile: activeVariant.plateStepFile,
          grid: {
            columns: SYSTEM.gridColumns,
            rows: SYSTEM.gridRows,
            pitch: activeVariant.gridPitchMm
          },
          gridPitchMm: activeVariant.gridPitchMm,
          wallThicknessMm: activeVariant.wallThicknessMm,
          innerFloorRadiusMm: activeVariant.innerFloorRadiusMm,
          outerClearanceMm: activeVariant.outerClearanceMm,
          stlTessellationLinearMm: activeVariant.stlTessellationLinearMm,
          stlTessellationAngularRad: activeVariant.stlTessellationAngularRad
        }),
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
      a.download = `slotcrate_layout_${activeVariant.id}.zip`;
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
    <div className="max-w-[1600px] mx-auto w-full p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[calc(100vh-170px)]">
        <div className="rounded-2xl border border-neutral-800/80 overflow-hidden bg-neutral-950 min-h-[38vh] lg:min-h-0">
          <LayoutGrid
            minCells={activeVariant.minCells}
            maxWidthCells={activeVariant.maxWidthCells}
            maxDepthCells={activeVariant.maxDepthCells}
            highlightFree={highlightFree}
          />
        </div>
        <div className="rounded-2xl border border-neutral-800/80 overflow-hidden bg-neutral-950 min-h-[38vh] lg:min-h-0">
          <Layout3DView
            gridPitchMm={activeVariant.gridPitchMm}
            wallThicknessMm={activeVariant.wallThicknessMm}
            innerFloorRadiusMm={activeVariant.innerFloorRadiusMm}
            outerClearanceMm={activeVariant.outerClearanceMm}
          />
        </div>
      </section>

      <aside className="space-y-4 rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-950 to-neutral-900 p-5 shadow-2xl shadow-black/25 text-sm">
        <Link href="/" className="slotcrate-inline-link inline-flex items-center gap-1">
          ← {t("nav.home")}
        </Link>

        <header>
          <h1 className="text-lg font-semibold">{t("planner.title")}</h1>
          <p className="text-neutral-400">{t("planner.description")}</p>
        </header>

        <section className="space-y-2 border-t border-neutral-800 pt-3">
          <label htmlFor="planner-variant" className="text-sm font-medium text-neutral-100">
            {t("planner.variant")}
          </label>
          <select
            id="planner-variant"
            value={activeVariant.id}
            onChange={(e) => {
              const next = e.target.value;
              void trackEvent("planner.variant.change", { from: activeVariant.id, to: next });
              setVariantId(next);
            }}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2"
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label} ({variant.maxWidthCells}x{variant.maxDepthCells}, {variant.gridPitchMm.toFixed(2)} mm)
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-2 border-t border-neutral-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-100">{t("planner.height", { height: selectedHeightMm.toFixed(1) })}</span>
            <span className="text-xs text-neutral-400">{selectedPreset} mm {t("generator.drawerLabel")}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DRAWER_HEIGHT_PRESETS.map((preset) => {
              const mm = mapDrawerHeightToBoxHeight(preset);
              const active = preset === selectedPreset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHeightMm(mm)}
                  className={[
                    "rounded-xl border px-2 py-2 text-left transition",
                    active
                      ? "border-crate-box bg-crate-box/15 text-white"
                      : "border-neutral-700 bg-neutral-900/80 text-neutral-200 hover:border-neutral-500"
                  ].join(" ")}
                >
                  <div className="text-xs font-medium">{preset} mm</div>
                  <div className="text-[11px] text-neutral-400">{mm.toFixed(1)} mm</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex gap-2 flex-wrap border-t border-neutral-800 pt-3">
          <button onClick={undo} disabled={past === 0} className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">
            {t("planner.undo", { count: past })}
          </button>
          <button onClick={redo} disabled={future === 0} className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">
            {t("planner.redo", { count: future })}
          </button>
          <button onClick={reset} disabled={boxes.length === 0} className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">
            {t("planner.reset")}
          </button>
        </div>

        <div className="border-t border-neutral-800 pt-3">
          <div>{t("planner.usedCells", { used: usedCells, total: totalCells })}</div>
          <div>{t("planner.boxCount", { count: boxes.length })}</div>
          <div>{t("planner.gridPitch", { pitch: activeVariant.gridPitchMm.toFixed(2) })}</div>
        </div>

        {selected && (
          <div className="border-t border-neutral-800 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-100">
                {selectedIds.length > 1
                  ? t("planner.multiSelection", { count: selectedIds.length })
                  : t("planner.selection")}
              </span>
              <button
                onClick={clearSelection}
                className="text-[11px] text-neutral-400 hover:text-neutral-200"
              >
                {t("planner.deselect")}
              </button>
            </div>

            {selectedIds.length === 1 ? (
              <div className="space-y-2">
                <div>{t("planner.position", { x: selected.x, y: selected.y })}</div>
                <div>{t("planner.gridSize", { width: selected.widthCells, depth: selected.depthCells })}</div>
                <div>
                  {t("planner.outerSize", {
                    width: (selected.widthCells * pitchMm).toFixed(2),
                    depth: (selected.depthCells * pitchMm).toFixed(2)
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-neutral-400">
                    {t("planner.editWidth")}
                    <input
                      type="number"
                      min={activeVariant.minCells}
                      max={activeVariant.maxWidthCells}
                      step={1}
                      value={selected.widthCells}
                      onChange={(e) => {
                        const w = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(w)) resizeBox(selected.id, w, selected.depthCells);
                      }}
                      className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-sm text-neutral-100"
                    />
                  </label>
                  <label className="text-[11px] text-neutral-400">
                    {t("planner.editDepth")}
                    <input
                      type="number"
                      min={activeVariant.minCells}
                      max={activeVariant.maxDepthCells}
                      step={1}
                      value={selected.depthCells}
                      onChange={(e) => {
                        const d = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(d)) resizeBox(selected.id, selected.widthCells, d);
                      }}
                      className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-sm text-neutral-100"
                    />
                  </label>
                </div>

                <label className="block text-[11px] text-neutral-400">
                  {t("planner.height", { height: selected.heightMm.toFixed(1) })}
                  <input
                    type="range"
                    min={SYSTEM.minHeightMm}
                    max={SYSTEM.maxHeightMm}
                    step={0.1}
                    value={selected.heightMm}
                    onChange={(e) => setBoxHeight(selected.id, Number.parseFloat(e.target.value))}
                    className="mt-1 w-full"
                  />
                </label>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => rotateSelected()}
                    className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs"
                  >
                    {t("planner.rotate")}
                  </button>
                  <button
                    onClick={() => duplicateSelected()}
                    className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs"
                  >
                    {t("planner.duplicate")}
                  </button>
                  <button
                    onClick={() => removeBox(selected.id)}
                    className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-xs"
                  >
                    {t("planner.remove")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-neutral-400">
                  {t("planner.multiHint")}
                </div>
                <ul className="max-h-24 overflow-auto text-[11px] text-neutral-300 space-y-0.5">
                  {selectedBoxes.map((b) => (
                    <li key={b.id}>
                      {t("planner.multiItem", { x: b.x, y: b.y, w: b.widthCells, d: b.depthCells })}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => rotateSelected()}
                    className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs"
                  >
                    {t("planner.rotate")}
                  </button>
                  <button
                    onClick={() => duplicateSelected()}
                    className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs"
                  >
                    {t("planner.duplicate")}
                  </button>
                  <button
                    onClick={() => removeSelected()}
                    className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-xs"
                  >
                    {t("planner.removeSelected", { count: selectedIds.length })}
                  </button>
                </div>
              </div>
            )}
            <div className="text-[11px] text-neutral-500">{t("planner.keyboardHint")}</div>
          </div>
        )}

        <section className="border-t border-neutral-800 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-100">{t("planner.autofill.title")}</h2>
            <label className="flex items-center gap-1 text-[11px] text-neutral-400">
              <input
                type="checkbox"
                checked={highlightFree}
                onChange={(e) => setHighlightFree(e.target.checked)}
              />
              {t("planner.autofill.highlight")}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="planner-fill-size" className="text-[11px] text-neutral-400">
              {t("planner.autofill.preferredSize")}
            </label>
            <select
              id="planner-fill-size"
              value={preferredFill.value}
              onChange={(e) => setPreferredFillSize(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-xs"
            >
              {fillSizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                const plan = planFillWithSize(boxes, preferredFill.w, preferredFill.d, {
                  maxWidthCells: activeVariant.maxWidthCells,
                  maxDepthCells: activeVariant.maxDepthCells
                });
                applyFillPlan(plan);
              }}
              disabled={freeReport.freeCells === 0}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-xs"
            >
              {t("planner.autofill.fillPreferred", { size: preferredFill.label })}
            </button>
            <button
              onClick={() => {
                const plan = planFillLargest(
                  boxes,
                  {
                    maxWidthCells: activeVariant.maxWidthCells,
                    maxDepthCells: activeVariant.maxDepthCells
                  },
                  { widthCells: preferredFill.w, depthCells: preferredFill.d }
                );
                applyFillPlan(plan);
              }}
              disabled={freeReport.freeCells === 0}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-xs"
            >
              {t("planner.autofill.fillLargest")}
            </button>
          </div>
          <div className="text-[11px] text-neutral-500">
            {t("planner.autofill.freeCells", { count: freeReport.freeCells })}
          </div>
          {freeReport.smallRegions > 0 && (
            <div className="rounded-lg border border-amber-800/60 bg-amber-900/20 p-2 text-[11px] text-amber-200">
              {t("planner.autofill.smallRemainderWarning", {
                regions: freeReport.smallRegions,
                cells: freeReport.smallRegionCells
              })}
            </div>
          )}
        </section>

        <div className="border-t border-neutral-800 pt-3 flex gap-2">
          <button
            onClick={exportZip}
            disabled={boxes.length === 0 || downloading}
            className="px-4 py-2 rounded bg-crate-box hover:brightness-110 disabled:opacity-50"
          >
            {downloading ? t("planner.exporting") : t("planner.exportZip")}
          </button>
          {downloading && (
            <button onClick={() => ac?.abort()} className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">
              {t("planner.cancel")}
            </button>
          )}
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}

        <PlannerPersistencePanel
          variantIds={variants.map((v) => v.id)}
          activeVariantId={activeVariant.id}
          onVariantChange={setVariantId}
        />
      </aside>
    </div>
  );
}

function mapDrawerHeightToBoxHeight(drawerMm: number): number {
  return Math.max(SYSTEM.minHeightMm, Math.min(SYSTEM.maxHeightMm, drawerMm - 4.2));
}
