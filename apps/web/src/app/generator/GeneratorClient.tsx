"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { BoxPreview } from "@/components/BoxPreview";
import type { GeneratorSettingsPayload } from "@/lib/generator-settings-schema";
import { SYSTEM } from "@/lib/system";

const DRAWER_HEIGHT_PRESETS = [
  { label: "20 mm", actualMm: 15.8 },
  { label: "40 mm", actualMm: 35.8 },
  { label: "60 mm", actualMm: 55.8 },
  { label: "80 mm", actualMm: 75.8 }
] as const;

type DrawerHeightPreset = (typeof DRAWER_HEIGHT_PRESETS)[number];
type SuitcaseVariant = GeneratorSettingsPayload["suitcaseVariants"][number];

export function GeneratorClient({
  defaultHeightMm,
  minHeightMm,
  maxHeightMm,
  minCells,
  maxCells,
  suitcaseVariants,
  filenamePrefix
}: {
  defaultHeightMm: number;
  minHeightMm: number;
  maxHeightMm: number;
  minCells: number;
  maxCells: number;
  suitcaseVariants?: SuitcaseVariant[];
  filenamePrefix: string;
}) {
  const t = useTranslations();
  const variants = suitcaseVariants?.length
    ? suitcaseVariants
    : [
        {
          id: "sc-124-v2",
          label: "SC 124 V2",
          minCells,
          maxWidthCells: maxCells,
          maxDepthCells: maxCells,
          gridPitchMm: SYSTEM.gridPitchMm,
          boxHeightMm: defaultHeightMm,
          wallThicknessMm: SYSTEM.wallThicknessMm,
          innerFloorRadiusMm: 2.5,
          outerClearanceMm: 0,
          stlTessellationLinearMm: 0.05,
          stlTessellationAngularRad: 0.5,
          plateStepFile: "SlotCrate.step"
        }
      ];
  const [variantId, setVariantId] = useState(variants[0]!.id);
  const activeVariant = variants.find((variant) => variant.id === variantId) ?? variants[0]!;
  const initialPreset = presetForHeight(activeVariant.boxHeightMm);
  const [widthCells, setWidthCells] = useState(activeVariant.minCells);
  const [depthCells, setDepthCells] = useState(activeVariant.minCells);
  const [drawerPreset, setDrawerPreset] = useState<DrawerHeightPreset>(initialPreset);
  const [heightMm, setHeightMm] = useState(
    Math.min(maxHeightMm, Math.max(minHeightMm, initialPreset.actualMm))
  );
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = pending || controller !== null;
  const clampHeight = (value: number) => Math.min(maxHeightMm, Math.max(minHeightMm, value));

  useEffect(() => {
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "generator.open",
        generator: "single-box",
        variantId: activeVariant.id
      })
    });
  }, [activeVariant.id]);

  async function download() {
    setError(null);
    const ac = new AbortController();
    setController(ac);
    try {
      const res = await fetch("/api/box/stl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widthCells,
          depthCells,
          heightMm,
          gridPitchMm: activeVariant.gridPitchMm,
          wallThicknessMm: activeVariant.wallThicknessMm,
          innerFloorRadiusMm: activeVariant.innerFloorRadiusMm,
          outerClearanceMm: activeVariant.outerClearanceMm,
          stlTessellationLinearMm: activeVariant.stlTessellationLinearMm,
          stlTessellationAngularRad: activeVariant.stlTessellationAngularRad
        }),
        signal: ac.signal
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`${res.status}: ${msg.slice(0, 200)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenamePrefix}_${activeVariant.id}_${widthCells}x${depthCells}_H${heightMm}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setController(null);
    }
  }

  function cancel() {
    controller?.abort();
    setController(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)] gap-6 p-4 sm:p-6 max-w-[1600px] mx-auto w-full">
      <form
        className="space-y-5 rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-950 to-neutral-900 p-5 shadow-2xl shadow-black/25"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(download);
        }}
      >
        <header className="space-y-1">
          <Link href="/" className="slotcrate-inline-link inline-flex items-center gap-1 text-sm">
            ← {t("nav.home")}
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{t("generator.title")}</h1>
          <p className="text-sm text-neutral-400">{t("generator.subtitle")}</p>
        </header>

        <section className="space-y-2">
          <label htmlFor="variant" className="text-sm font-medium text-neutral-100">
            {t("generator.variant")}
          </label>
          <select
            id="variant"
            value={activeVariant.id}
            onChange={(e) => {
              const next = variants.find((variant) => variant.id === e.target.value);
              if (!next) return;
              setVariantId(next.id);
              setWidthCells((curr) => Math.min(next.maxWidthCells, Math.max(next.minCells, curr)));
              setDepthCells((curr) => Math.min(next.maxDepthCells, Math.max(next.minCells, curr)));
              const nextPreset = presetForHeight(next.boxHeightMm);
              setDrawerPreset(nextPreset);
              setHeightMm(clampHeight(nextPreset.actualMm));
            }}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-sm"
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label} ({variant.maxWidthCells}x{variant.maxDepthCells}, {variant.gridPitchMm.toFixed(2)} mm)
              </option>
            ))}
          </select>
        </section>

        <SliderField
          id="w"
          label={t("generator.width")}
          value={widthCells}
          min={Math.max(minCells, activeVariant.minCells)}
          max={Math.min(maxCells, activeVariant.maxWidthCells)}
          unit="x"
          onChange={setWidthCells}
        />

        <SliderField
          id="d"
          label={t("generator.depth")}
          value={depthCells}
          min={Math.max(minCells, activeVariant.minCells)}
          max={Math.min(maxCells, activeVariant.maxDepthCells)}
          unit="x"
          onChange={setDepthCells}
        />

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-100">{t("generator.height")}</p>
              <p className="text-xs text-neutral-400">{t("generator.heightHint")}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-white">{heightMm.toFixed(1)} mm</div>
              <div className="text-xs text-neutral-400">
                {drawerPreset.label} {t("generator.drawerLabel")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {DRAWER_HEIGHT_PRESETS.map((preset) => {
              const active = preset.label === drawerPreset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setDrawerPreset(preset);
                    setHeightMm(clampHeight(preset.actualMm));
                  }}
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

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-3">
            <input
              id="h"
              type="range"
              min={0}
              max={DRAWER_HEIGHT_PRESETS.length - 1}
              step={1}
              value={presetIndex(drawerPreset)}
              onChange={(e) => {
                const next = presetAtIndex(
                  clampInt(e.target.value, 0, DRAWER_HEIGHT_PRESETS.length - 1)
                );
                setDrawerPreset(next);
                setHeightMm(clampHeight(next.actualMm));
              }}
              className="slotcrate-range"
              aria-label={t("generator.height")}
            />
            <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
              {DRAWER_HEIGHT_PRESETS.map((preset) => (
                <span key={preset.label}>{preset.label}</span>
              ))}
            </div>
          </div>

          <p className="text-xs text-neutral-400">{t("generator.hint")}</p>
        </section>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-crate-box text-neutral-950 font-medium hover:brightness-110 disabled:opacity-50"
          >
            {busy ? t("generator.downloading") : t("generator.download")}
          </button>
          {busy && (
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600"
            >
              {t("generator.cancel")}
            </button>
          )}
        </div>
        {error && (
          <div className="text-sm text-red-400" role="alert">
            {t("generator.error", { message: error })}
          </div>
        )}
      </form>
      <div className="min-h-[460px] h-[62vh] sm:h-[66vh] lg:h-[76vh] xl:h-[80vh] 2xl:h-[84vh] rounded-2xl border border-neutral-800/80 overflow-hidden bg-neutral-950">
        <BoxPreview
          widthCells={widthCells}
          depthCells={depthCells}
          heightMm={heightMm}
          gridPitchMm={activeVariant.gridPitchMm}
          wallThicknessMm={activeVariant.wallThicknessMm}
          innerFloorRadiusMm={activeVariant.innerFloorRadiusMm}
          outerClearanceMm={activeVariant.outerClearanceMm}
        />
      </div>
    </div>
  );
}

function clampInt(value: string, min: number, max: number): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function SliderField({
  id,
  label,
  value,
  min,
  max,
  unit,
  onChange
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange(value: number): void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-neutral-100">
          {label}
        </label>
        <div className="text-right">
          <div className="text-lg font-semibold text-white">
            {value}
            <span className="ml-1 text-sm font-medium text-neutral-400">{unit}</span>
          </div>
          <div className="text-[11px] text-neutral-500">
            {label.toLowerCase()} {min}–{max}
          </div>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(clampInt(e.target.value, min, max))}
        className="slotcrate-range"
        aria-label={label}
      />
    </section>
  );
}

function presetForHeight(heightMm: number): DrawerHeightPreset {
  const exact = DRAWER_HEIGHT_PRESETS.find((preset) => Math.abs(preset.actualMm - heightMm) < 0.05);
  return exact ?? DRAWER_HEIGHT_PRESETS[1]!;
}

function presetAtIndex(index: number): DrawerHeightPreset {
  return DRAWER_HEIGHT_PRESETS[index] ?? DRAWER_HEIGHT_PRESETS[1]!;
}

function presetIndex(preset: DrawerHeightPreset): number {
  return DRAWER_HEIGHT_PRESETS.findIndex((entry) => entry.label === preset.label);
}
