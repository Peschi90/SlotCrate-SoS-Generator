"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SYSTEM } from "@/lib/system";
import type { Pocket } from "@/lib/schema";

interface Props {
  widthCells: number;
  depthCells: number;
  heightMm: number;
  gridPitchMm?: number;
  wallThicknessMm?: number;
  pockets: Pocket[];
  onChange(next: Pocket[]): void;
  fillOuter: boolean;
  onFillOuterChange(value: boolean): void;
  activeIndex?: number | null;
  onActiveIndexChange?: (index: number | null) => void;
}

/**
 * Freie mm-Positionierung runder Taschen (Becher/Rundwand). Dicke ist an
 * `wallThicknessMm` gebunden. Auto-Fill legt ein Quadratraster im Innenraum an.
 */
export function PocketEditor({
  widthCells,
  depthCells,
  heightMm,
  gridPitchMm = SYSTEM.gridPitchMm,
  wallThicknessMm = SYSTEM.wallThicknessMm,
  pockets,
  onChange,
  fillOuter,
  onFillOuterChange,
  activeIndex = null,
  onActiveIndexChange
}: Props) {
  const t = useTranslations();
  const innerW = Math.max(0, widthCells * gridPitchMm - 2 * wallThicknessMm);
  const innerD = Math.max(0, depthCells * gridPitchMm - 2 * wallThicknessMm);
  const cavityH = Math.max(0, heightMm - SYSTEM.pickupTopZMm - SYSTEM.floorThicknessMm);
  const maxDiameter = Math.max(
    SYSTEM.minPocketDiameterMm,
    Math.min(SYSTEM.maxPocketDiameterMm, Math.min(innerW, innerD))
  );

  const [defaultDiameter, setDefaultDiameter] = useState<number>(
    Math.min(20, round(maxDiameter, 1))
  );
  const [defaultHeight, setDefaultHeight] = useState<number>(round(cavityH, 1));

  const clampedDefaultDiameter = clamp(defaultDiameter, SYSTEM.minPocketDiameterMm, maxDiameter);
  const clampedDefaultHeight = clamp(defaultHeight, SYSTEM.minPocketHeightMm, cavityH);

  const atMax = pockets.length >= SYSTEM.maxPocketsPerBox;

  function add() {
    if (atMax) return;
    const r = clampedDefaultDiameter / 2;
    if (r > innerW / 2 || r > innerD / 2) return;
    onChange([
      ...pockets,
      {
        centerXMm: round(innerW / 2, 2),
        centerYMm: round(innerD / 2, 2),
        diameterMm: round(clampedDefaultDiameter, 2),
        heightMm: round(clampedDefaultHeight, 2)
      }
    ]);
    onActiveIndexChange?.(pockets.length);
  }

  function autoFill() {
    const diameter = clampedDefaultDiameter;
    const height = clampedDefaultHeight;
    const r = diameter / 2;
    if (r <= 0 || innerW < diameter || innerD < diameter) return;
    // Quadratraster mit Kontakt-Spacing = diameter; Ränder werden zentriert.
    const nx = Math.floor(innerW / diameter);
    const ny = Math.floor(innerD / diameter);
    if (nx * ny <= 0) return;
    if (nx * ny > SYSTEM.maxPocketsPerBox) return;
    const marginX = (innerW - nx * diameter) / 2;
    const marginY = (innerD - ny * diameter) / 2;
    const next: Pocket[] = [];
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        next.push({
          centerXMm: round(marginX + r + ix * diameter, 2),
          centerYMm: round(marginY + r + iy * diameter, 2),
          diameterMm: round(diameter, 2),
          heightMm: round(height, 2)
        });
      }
    }
    onChange(next);
    onActiveIndexChange?.(null);
  }

  function clear() {
    onChange([]);
    onActiveIndexChange?.(null);
  }

  function update(index: number, patch: Partial<Pocket>) {
    onChange(
      pockets.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  }

  function remove(index: number) {
    onChange(pockets.filter((_, i) => i !== index));
    if (activeIndex === index) onActiveIndexChange?.(null);
    else if (activeIndex !== null && activeIndex > index) onActiveIndexChange?.(activeIndex - 1);
  }

  const autoGridEstimate = estimateGrid(innerW, innerD, clampedDefaultDiameter);
  const autoFillDisabled = autoGridEstimate.count <= 0 || autoGridEstimate.count > SYSTEM.maxPocketsPerBox;

  return (
    <section className="space-y-3">

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">
              {t("pockets.diameter")}
            </span>
            <input
              type="number"
              min={SYSTEM.minPocketDiameterMm}
              max={maxDiameter}
              step={0.5}
              value={clampedDefaultDiameter}
              onChange={(e) =>
                setDefaultDiameter(
                  clamp(Number(e.target.value), SYSTEM.minPocketDiameterMm, maxDiameter)
                )
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-xs text-neutral-100"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">
              {t("pockets.height")}
            </span>
            <input
              type="number"
              min={SYSTEM.minPocketHeightMm}
              max={Math.max(SYSTEM.minPocketHeightMm, round(cavityH, 2))}
              step={0.5}
              value={clampedDefaultHeight}
              onChange={(e) =>
                setDefaultHeight(clamp(Number(e.target.value), SYSTEM.minPocketHeightMm, cavityH))
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-xs text-neutral-100"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={add}
            disabled={atMax || clampedDefaultDiameter > innerW || clampedDefaultDiameter > innerD}
            className="rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-[11px] font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            + {t("pockets.addOne")}
          </button>
          <button
            type="button"
            onClick={autoFill}
            disabled={autoFillDisabled}
            className="rounded-lg border border-crate-box/60 bg-crate-box/10 px-2 py-1 text-[11px] font-medium text-white transition hover:border-crate-box disabled:opacity-50"
          >
            {t("pockets.autoFill", { count: autoGridEstimate.count })}
          </button>
          {pockets.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-red-800/60 bg-red-900/30 px-2 py-1 text-[11px] font-medium text-red-200 transition hover:border-red-700"
            >
              {t("pockets.clear")}
            </button>
          )}
        </div>
        {autoGridEstimate.count > SYSTEM.maxPocketsPerBox && (
          <p className="text-[10px] text-amber-300">
            {t("pockets.tooManyWarning", {
              count: autoGridEstimate.count,
              max: SYSTEM.maxPocketsPerBox
            })}
          </p>
        )}
        <label className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer">
          <input
            type="checkbox"
            checked={fillOuter}
            onChange={(e) => onFillOuterChange(e.target.checked)}
            className="accent-crate-box"
          />
          <span>{t("pockets.fillOuter")}</span>
        </label>
        <p className="text-[10px] text-neutral-500">
          {fillOuter ? t("pockets.fillOuterHintOn") : t("pockets.fillOuterHintOff")}
        </p>
      </div>

      {pockets.length === 0 ? (
        <p className="text-[11px] text-neutral-500">{t("pockets.empty")}</p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-auto pr-1">
          {pockets.map((p, idx) => {
            const r = p.diameterMm / 2;
            const minX = round(r, 3);
            const maxX = round(Math.max(minX, innerW - r), 3);
            const minY = round(r, 3);
            const maxY = round(Math.max(minY, innerD - r), 3);
            const isActive = idx === activeIndex;
            return (
              <li
                key={idx}
                onFocus={() => onActiveIndexChange?.(idx)}
                onClick={() => onActiveIndexChange?.(idx)}
                className={[
                  "rounded-xl border p-2 space-y-2 transition",
                  isActive
                    ? "border-crate-box bg-crate-box/10 shadow-[0_0_0_1px_rgba(76,140,255,0.35)]"
                    : "border-neutral-800 bg-neutral-900/60"
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                    {t("pockets.itemHeading", { index: idx + 1 })}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(idx);
                    }}
                    className="rounded-full border border-red-800/60 bg-red-900/30 px-2 py-0.5 text-[11px] text-red-200 hover:bg-red-900/50"
                    aria-label={t("pockets.remove")}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <SliderRow
                    label={t("pockets.diameter")}
                    value={p.diameterMm}
                    min={SYSTEM.minPocketDiameterMm}
                    max={Math.min(innerW, innerD)}
                    step={0.5}
                    unit="mm"
                    onChange={(v) => update(idx, { diameterMm: round(v, 2) })}
                  />
                  <SliderRow
                    label={t("pockets.height")}
                    value={p.heightMm}
                    min={SYSTEM.minPocketHeightMm}
                    max={cavityH}
                    step={0.5}
                    unit="mm"
                    onChange={(v) => update(idx, { heightMm: round(v, 2) })}
                  />
                  <SliderRow
                    label="X"
                    value={p.centerXMm}
                    min={minX}
                    max={maxX}
                    step={0.5}
                    unit="mm"
                    onChange={(v) => update(idx, { centerXMm: round(v, 2) })}
                  />
                  <SliderRow
                    label="Y"
                    value={p.centerYMm}
                    min={minY}
                    max={maxY}
                    step={0.5}
                    unit="mm"
                    onChange={(v) => update(idx, { centerYMm: round(v, 2) })}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[10px] text-neutral-500">
        {t("pockets.hint", { thickness: wallThicknessMm.toFixed(2) })}
      </p>
      <p className="text-[10px] text-neutral-500">{t("pockets.dragHint")}</p>
    </section>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange(v: number): void;
}

function SliderRow({ label, value, min, max, step, unit, onChange }: SliderRowProps) {
  const clamped = clamp(value, min, max);
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slotcrate-range flex-1"
        />
        <span className="w-16 text-right text-xs font-mono text-neutral-200">
          {clamped.toFixed(1)}{unit ? ` ${unit}` : ""}
        </span>
      </div>
    </label>
  );
}

function estimateGrid(innerW: number, innerD: number, diameter: number): { count: number; nx: number; ny: number } {
  if (diameter <= 0 || innerW < diameter || innerD < diameter) return { count: 0, nx: 0, ny: 0 };
  const nx = Math.floor(innerW / diameter);
  const ny = Math.floor(innerD / diameter);
  return { count: nx * ny, nx, ny };
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
