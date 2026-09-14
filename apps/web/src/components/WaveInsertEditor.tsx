"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SYSTEM } from "@/lib/system";
import type { WaveInsert } from "@/lib/schema";

interface Props {
  widthCells: number;
  depthCells: number;
  heightMm: number;
  gridPitchMm?: number;
  wallThicknessMm?: number;
  waveInserts: WaveInsert[];
  onChange(next: WaveInsert[]): void;
  activeIndex?: number | null;
  onActiveIndexChange?: (index: number | null) => void;
}

/**
 * Wannen-Einsätze: rinnenförmige (wellenförmige) Vertiefungen für runde
 * Werkzeuge (z. B. Schraubendreher), die dann in einem harten oder weichen
 * Bogen liegen. `grooveDepthMm` steuert, wie tief/hart der Bogen ausfällt.
 */
export function WaveInsertEditor({
  widthCells,
  depthCells,
  heightMm,
  gridPitchMm = SYSTEM.gridPitchMm,
  wallThicknessMm = SYSTEM.wallThicknessMm,
  waveInserts,
  onChange,
  activeIndex = null,
  onActiveIndexChange
}: Props) {
  const t = useTranslations();
  const innerW = Math.max(0, widthCells * gridPitchMm - 2 * wallThicknessMm);
  const innerD = Math.max(0, depthCells * gridPitchMm - 2 * wallThicknessMm);
  const cavityH = Math.max(0, heightMm - SYSTEM.pickupTopZMm - SYSTEM.floorThicknessMm);
  const atMax = waveInserts.length >= SYSTEM.maxWaveInsertsPerBox;
  const dragStartDiameterRef = useRef<{ index: number; value: number } | null>(null);
  const [pendingMismatch, setPendingMismatch] = useState<{
    index: number;
    revertDiameterMm: number;
    suggestedCount: number;
    filledDiameterMm: number;
  } | null>(null);

  function perpSpan(axis: "x" | "y"): number {
    return axis === "x" ? innerW : innerD;
  }

  function defaultGrooveDiameter(axis: "x" | "y"): number {
    const span = perpSpan(axis);
    return clamp(round(Math.min(15, span), 1), SYSTEM.minWaveGrooveDiameterMm, SYSTEM.maxWaveGrooveDiameterMm);
  }

  /** Rundet den Rinnendurchmesser so ab, dass count·durchmesser den Innenraum
   * nie überschreitet (verhindert Ablehnung durch clampWaveInserts). */
  function fillingDiameter(span: number, count: number): number {
    return Math.floor((span / count) * 100) / 100;
  }

  function fillingCount(span: number, diameter: number): number {
    const raw = Math.round(span / Math.max(0.01, diameter));
    return clamp(raw, SYSTEM.minWaveGrooveCount, SYSTEM.maxWaveGrooveCount);
  }

  function add(axis: "x" | "y") {
    if (atMax) return;
    const span = perpSpan(axis);
    const desiredDiameter = defaultGrooveDiameter(axis);
    if (desiredDiameter <= 0 || desiredDiameter > span) return;
    // Anzahl + Durchmesser werden so gewählt, dass der komplette Innenraum
    // ohne seitliche Lücke ausgefüllt wird.
    const count = fillingCount(span, desiredDiameter);
    const diameter = clamp(
      fillingDiameter(span, count),
      SYSTEM.minWaveGrooveDiameterMm,
      SYSTEM.maxWaveGrooveDiameterMm
    );
    const depth = clamp(round(diameter / 4, 2), SYSTEM.minWaveGrooveDepthMm, Math.min(diameter / 2, cavityH));
    onChange([
      ...waveInserts,
      {
        axis,
        offsetMm: round(span / 2, 2),
        heightMm: round(cavityH, 2),
        grooveDiameterMm: round(diameter, 2),
        grooveCount: count,
        grooveDepthMm: depth
      }
    ]);
    onActiveIndexChange?.(waveInserts.length);
  }

  function update(index: number, patch: Partial<WaveInsert>) {
    onChange(waveInserts.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  }

  /** Achse wechseln und Rinnenanzahl/-durchmesser/Position an die neue
   * (ggf. andere) Spannweite anpassen, statt den Einsatz beim Sanitizing
   * lautlos zu verlieren, wenn Kasten nicht quadratisch ist. */
  function toggleAxis(index: number) {
    const w = waveInserts[index];
    if (!w) return;
    const newAxis: "x" | "y" = w.axis === "x" ? "y" : "x";
    const newSpan = perpSpan(newAxis);
    let diameter = w.grooveDiameterMm;
    let count = w.grooveCount;
    if (count * diameter > newSpan || count <= 0 || diameter <= 0) {
      count = fillingCount(newSpan, diameter);
      diameter = clamp(
        fillingDiameter(newSpan, count),
        SYSTEM.minWaveGrooveDiameterMm,
        SYSTEM.maxWaveGrooveDiameterMm
      );
    }
    const halfSpan = (count * diameter) / 2;
    const offsetMm = clamp(w.offsetMm, halfSpan, Math.max(halfSpan, newSpan - halfSpan));
    update(index, {
      axis: newAxis,
      grooveCount: count,
      grooveDiameterMm: round(diameter, 2),
      offsetMm: round(offsetMm, 2),
      grooveDepthMm: Math.min(w.grooveDepthMm, diameter / 2)
    });
  }

  function remove(index: number) {
    onChange(waveInserts.filter((_, i) => i !== index));
    if (activeIndex === index) onActiveIndexChange?.(null);
    else if (activeIndex !== null && activeIndex > index) onActiveIndexChange?.(activeIndex - 1);
  }

  function beginDiameterDrag(index: number) {
    const w = waveInserts[index];
    if (!w) return;
    dragStartDiameterRef.current = { index, value: w.grooveDiameterMm };
  }

  function finalizeDiameterDrag(index: number) {
    const started = dragStartDiameterRef.current;
    dragStartDiameterRef.current = null;
    if (!started || started.index !== index) return;
    const w = waveInserts[index];
    if (!w) return;
    if (Math.abs(w.grooveDiameterMm - started.value) < 0.01) return;
    const span = perpSpan(w.axis);
    const currentSpan = w.grooveCount * w.grooveDiameterMm;
    if (Math.abs(currentSpan - span) <= 0.05) return;
    const suggestedCount = fillingCount(span, w.grooveDiameterMm);
    const filledDiameterMm = clamp(
      fillingDiameter(span, suggestedCount),
      SYSTEM.minWaveGrooveDiameterMm,
      SYSTEM.maxWaveGrooveDiameterMm
    );
    setPendingMismatch({
      index,
      revertDiameterMm: started.value,
      suggestedCount,
      filledDiameterMm
    });
  }

  function confirmMismatch() {
    if (!pendingMismatch) return;
    const { index, suggestedCount, filledDiameterMm } = pendingMismatch;
    const w = waveInserts[index];
    if (w) {
      update(index, {
        grooveDiameterMm: round(filledDiameterMm, 2),
        grooveCount: suggestedCount,
        grooveDepthMm: Math.min(w.grooveDepthMm, filledDiameterMm / 2)
      });
    }
    setPendingMismatch(null);
  }

  function cancelMismatch() {
    if (!pendingMismatch) return;
    update(pendingMismatch.index, { grooveDiameterMm: pendingMismatch.revertDiameterMm });
    setPendingMismatch(null);
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-end">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => add("x")}
            disabled={atMax || innerW < SYSTEM.minWaveGrooveDiameterMm || cavityH < SYSTEM.minWaveHeightMm}
            className="rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-[11px] font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            + {t("waveInserts.addX")}
          </button>
          <button
            type="button"
            onClick={() => add("y")}
            disabled={atMax || innerD < SYSTEM.minWaveGrooveDiameterMm || cavityH < SYSTEM.minWaveHeightMm}
            className="rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-[11px] font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            + {t("waveInserts.addY")}
          </button>
        </div>
      </div>

      {waveInserts.length === 0 ? (
        <p className="text-[11px] text-neutral-500">{t("waveInserts.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {waveInserts.map((w, idx) => {
            const span = perpSpan(w.axis);
            // Durch Anzahl teilen, sonst könnte der Slider Werte zulassen, die
            // den Einsatz beim Sanitizing unbemerkt komplett verwerfen.
            const maxDiameter = Math.min(SYSTEM.maxWaveGrooveDiameterMm, span / w.grooveCount);
            const blockSpan = w.grooveCount * w.grooveDiameterMm;
            const halfSpan = blockSpan / 2;
            const minOffset = round(halfSpan, 3);
            const maxOffset = round(Math.max(minOffset, span - halfSpan), 3);
            const maxDepth = Math.min(w.grooveDiameterMm / 2, cavityH);
            const isActive = idx === activeIndex;
            const maxCountForDiameter = Math.max(
              1,
              Math.min(SYSTEM.maxWaveGrooveCount, Math.floor(span / Math.max(1, w.grooveDiameterMm)))
            );
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
                  <div className="inline-flex items-center gap-1 text-xs text-neutral-300">
                    <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px]">
                      {w.axis === "x" ? t("dividers.axisXLabel") : t("dividers.axisYLabel")}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleAxis(idx)}
                      className="rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:border-neutral-500"
                      aria-label={t("dividers.toggleAxis")}
                    >
                      ↔
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(idx);
                    }}
                    className="rounded-full border border-red-800/60 bg-red-900/30 px-2 py-0.5 text-[11px] text-red-200 hover:bg-red-900/50"
                    aria-label={t("waveInserts.remove")}
                  >
                    ✕
                  </button>
                </div>

                <SliderRow
                  label={t("waveInserts.offsetLabel")}
                  value={w.offsetMm}
                  min={minOffset}
                  max={maxOffset}
                  step={0.5}
                  unit="mm"
                  onChange={(v) => update(idx, { offsetMm: round(v, 2) })}
                />
                <SliderRow
                  label={t("waveInserts.heightLabel")}
                  value={w.heightMm}
                  min={SYSTEM.minWaveHeightMm}
                  max={Math.max(SYSTEM.minWaveHeightMm, round(cavityH, 3))}
                  step={0.5}
                  unit="mm"
                  onChange={(v) => update(idx, { heightMm: round(v, 2) })}
                />
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                    {t("waveInserts.grooveDiameter")}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={SYSTEM.minWaveGrooveDiameterMm}
                      max={Math.max(SYSTEM.minWaveGrooveDiameterMm, maxDiameter)}
                      step={0.5}
                      value={clamp(w.grooveDiameterMm, SYSTEM.minWaveGrooveDiameterMm, maxDiameter)}
                      onPointerDown={() => beginDiameterDrag(idx)}
                      onChange={(e) => {
                        const v = round(Number(e.target.value), 2);
                        update(idx, {
                          grooveDiameterMm: v,
                          grooveDepthMm: Math.min(w.grooveDepthMm, v / 2)
                        });
                      }}
                      onPointerUp={() => finalizeDiameterDrag(idx)}
                      onKeyUp={() => finalizeDiameterDrag(idx)}
                      className="slotcrate-range flex-1"
                    />
                    <span className="w-16 text-right text-xs font-mono text-neutral-200">
                      {clamp(w.grooveDiameterMm, SYSTEM.minWaveGrooveDiameterMm, maxDiameter).toFixed(1)} mm
                    </span>
                  </div>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                    {t("waveInserts.grooveCount")}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={SYSTEM.minWaveGrooveCount}
                      max={maxCountForDiameter}
                      step={1}
                      value={clamp(w.grooveCount, SYSTEM.minWaveGrooveCount, maxCountForDiameter)}
                      onChange={(e) =>
                        update(idx, {
                          grooveCount: Math.round(
                            clamp(Number(e.target.value), SYSTEM.minWaveGrooveCount, maxCountForDiameter)
                          )
                        })
                      }
                      className="slotcrate-range flex-1"
                    />
                    <span className="w-16 text-right text-xs font-mono text-neutral-200">
                      {w.grooveCount}
                    </span>
                  </div>
                </label>
                <SliderRow
                  label={t("waveInserts.grooveDepth")}
                  value={w.grooveDepthMm}
                  min={SYSTEM.minWaveGrooveDepthMm}
                  max={Math.max(SYSTEM.minWaveGrooveDepthMm, maxDepth)}
                  step={0.1}
                  unit="mm"
                  onChange={(v) => update(idx, { grooveDepthMm: round(v, 2) })}
                />
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[10px] text-neutral-500">{t("waveInserts.hint")}</p>

      <ConfirmDialog
        open={pendingMismatch !== null}
        title={t("waveInserts.mismatchTitle")}
        message={t("waveInserts.mismatchMessage", { count: pendingMismatch?.suggestedCount ?? 0 })}
        confirmLabel={t("waveInserts.mismatchConfirm")}
        cancelLabel={t("waveInserts.mismatchCancel")}
        onConfirm={confirmMismatch}
        onCancel={cancelMismatch}
      />
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

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
