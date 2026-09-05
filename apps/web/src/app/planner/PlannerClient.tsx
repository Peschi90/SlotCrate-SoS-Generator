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

const DRAWER_HEIGHT_PRESETS = [
  { label: "20 mm", actualMm: 15.8 },
  { label: "40 mm", actualMm: 35.8 },
  { label: "60 mm", actualMm: 55.8 },
  { label: "80 mm", actualMm: 75.8 }
] as const;

type DrawerHeightPreset = (typeof DRAWER_HEIGHT_PRESETS)[number];

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
    setHeightMm(presetForHeight(preferred).actualMm);
  }, [activeVariant?.id, activeVariant?.boxHeightMm, defaultHeightMm, setHeightMm]);

  useEffect(() => {
    void trackEvent("planner.open");
  }, [activeVariant.id]);

  const heightState = useMemo(() => computeHeightState(selectedBoxes, selectedHeightMm), [selectedBoxes, selectedHeightMm]);

  function applyHeightPreset(preset: DrawerHeightPreset) {
    if (selectedBoxes.length > 0) {
      for (const b of selectedBoxes) setBoxHeight(b.id, preset.actualMm);
    } else {
      setHeightMm(preset.actualMm);
    }
  }

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
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-sm transition focus:border-crate-box focus:outline-none"
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label} ({variant.maxWidthCells}x{variant.maxDepthCells}, {variant.gridPitchMm.toFixed(2)} mm)
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-3 border-t border-neutral-800 pt-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-100">{t("planner.heightTitle")}</p>
              <p className="text-xs text-neutral-400">
                {heightState.scope === "selection"
                  ? t("planner.heightScopeSelection", { count: selectedBoxes.length })
                  : t("planner.heightScopeDefault")}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-white">
                {heightState.mixed ? t("planner.heightMixed") : `${heightState.value.toFixed(1)} mm`}
              </div>
              <div className="text-xs text-neutral-400">
                {heightState.preset.label} {t("generator.drawerLabel")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {DRAWER_HEIGHT_PRESETS.map((preset) => {
              const active = !heightState.mixed && preset.label === heightState.preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyHeightPreset(preset)}
                  className={[
                    "rounded-xl border px-3 py-2 text-left transition",
                    active
                      ? "border-crate-box bg-crate-box/15 text-white shadow-[0_0_0_1px_rgba(76,140,255,0.35)]"
                      : "border-neutral-700 bg-neutral-900/80 text-neutral-200 hover:border-neutral-500"
                  ].join(" ")}
                >
                  <div className="text-sm font-medium">{preset.label}</div>
                  <div className="text-xs text-neutral-400">{preset.actualMm.toFixed(1)} mm</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex gap-2 flex-wrap border-t border-neutral-800 pt-3">
          <button
            onClick={undo}
            disabled={past === 0}
            className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            {t("planner.undo", { count: past })}
          </button>
          <button
            onClick={redo}
            disabled={future === 0}
            className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            {t("planner.redo", { count: future })}
          </button>
          <button
            onClick={reset}
            disabled={boxes.length === 0}
            className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            {t("planner.reset")}
          </button>
        </div>

        <div className="border-t border-neutral-800 pt-3 space-y-1 text-xs text-neutral-300">
          <div>{t("planner.usedCells", { used: usedCells, total: totalCells })}</div>
          <div>{t("planner.boxCount", { count: boxes.length })}</div>
          <div>{t("planner.gridPitch", { pitch: activeVariant.gridPitchMm.toFixed(2) })}</div>
        </div>

        {selected && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 text-xs text-neutral-300">
                {selectedIds.length > 1 ? (
                  <div className="text-sm font-medium text-neutral-100">
                    {t("planner.multiSelection", { count: selectedIds.length })}
                  </div>
                ) : (
                  <>
                    <div>{t("planner.position", { x: selected.x, y: selected.y })}</div>
                    <div>{t("planner.gridSize", { width: selected.widthCells, depth: selected.depthCells })}</div>
                    <div>
                      {t("planner.outerSize", {
                        width: (selected.widthCells * pitchMm).toFixed(2),
                        depth: (selected.depthCells * pitchMm).toFixed(2)
                      })}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={clearSelection}
                aria-label={t("planner.deselect")}
                className="rounded-full border border-neutral-700 bg-neutral-900/80 px-2 py-0.5 text-[11px] text-neutral-300 transition hover:border-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedIds.length > 1 && (
              <ul className="max-h-24 overflow-auto rounded-lg bg-neutral-950/60 p-2 text-[11px] text-neutral-300 space-y-0.5">
                {selectedBoxes.map((b) => (
                  <li key={b.id}>
                    {t("planner.multiItem", { x: b.x, y: b.y, w: b.widthCells, d: b.depthCells })}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => rotateSelected()}
                className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500"
              >
                {t("planner.rotate")}
              </button>
              <button
                onClick={() => duplicateSelected()}
                className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500"
              >
                {t("planner.duplicate")}
              </button>
              {selectedIds.length > 1 ? (
                <button
                  onClick={() => removeSelected()}
                  className="rounded-xl border border-red-800/60 bg-red-900/30 px-3 py-2 text-xs font-medium text-red-200 transition hover:border-red-700 hover:bg-red-900/50"
                >
                  {t("planner.removeSelected", { count: selectedIds.length })}
                </button>
              ) : (
                <button
                  onClick={() => removeBox(selected.id)}
                  className="rounded-xl border border-red-800/60 bg-red-900/30 px-3 py-2 text-xs font-medium text-red-200 transition hover:border-red-700 hover:bg-red-900/50"
                >
                  {t("planner.remove")}
                </button>
              )}
            </div>
            <div className="text-[11px] text-neutral-500">{t("planner.keyboardHint")}</div>
          </div>
        )}

        <section className="border-t border-neutral-800 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-100">{t("planner.autofill.title")}</h2>
            <label className="inline-flex items-center gap-2 text-[11px] text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={highlightFree}
                onChange={(e) => setHighlightFree(e.target.checked)}
                className="accent-crate-box"
              />
              {t("planner.autofill.highlight")}
            </label>
          </div>
          <label htmlFor="planner-fill-size" className="block space-y-1">
            <span className="text-[11px] text-neutral-400">{t("planner.autofill.preferredSize")}</span>
            <select
              id="planner-fill-size"
              value={preferredFill.value}
              onChange={(e) => setPreferredFillSize(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-sm"
            >
              {fillSizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
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
              className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
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
              className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
            >
              {t("planner.autofill.fillLargest")}
            </button>
          </div>
          <div className="text-[11px] text-neutral-500">
            {t("planner.autofill.freeCells", { count: freeReport.freeCells })}
          </div>
          {freeReport.smallRegions > 0 && (
            <div className="rounded-xl border border-amber-800/60 bg-amber-900/20 p-2 text-[11px] text-amber-200">
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
            className="rounded-xl bg-crate-box px-4 py-2 font-medium text-neutral-950 shadow-[0_0_18px_rgba(76,140,255,0.35)] transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
          >
            {downloading ? t("planner.exporting") : t("planner.exportZip")}
          </button>
          {downloading && (
            <button
              onClick={() => ac?.abort()}
              className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500"
            >
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

function presetForHeight(mm: number): DrawerHeightPreset {
  let best: DrawerHeightPreset = DRAWER_HEIGHT_PRESETS[1];
  let bestDelta = Math.abs(best.actualMm - mm);
  for (const preset of DRAWER_HEIGHT_PRESETS) {
    const delta = Math.abs(preset.actualMm - mm);
    if (delta < bestDelta) {
      best = preset;
      bestDelta = delta;
    }
  }
  return best;
}

interface HeightState {
  scope: "default" | "selection";
  mixed: boolean;
  value: number;
  preset: DrawerHeightPreset;
}

function computeHeightState(
  selectedBoxes: Array<{ heightMm: number }>,
  defaultHeightMm: number
): HeightState {
  if (selectedBoxes.length === 0) {
    return {
      scope: "default",
      mixed: false,
      value: defaultHeightMm,
      preset: presetForHeight(defaultHeightMm)
    };
  }
  const first = selectedBoxes[0]!.heightMm;
  const mixed = selectedBoxes.some((b) => Math.abs(b.heightMm - first) > 0.05);
  return {
    scope: "selection",
    mixed,
    value: first,
    preset: presetForHeight(first)
  };
}
