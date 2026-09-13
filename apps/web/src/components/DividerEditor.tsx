"use client";

import { useTranslations } from "next-intl";
import { SYSTEM } from "@/lib/system";
import type { Divider } from "@/lib/schema";

interface Props {
  widthCells: number;
  depthCells: number;
  heightMm: number;
  gridPitchMm?: number;
  wallThicknessMm?: number;
  dividers: Divider[];
  onChange(next: Divider[]): void;
}

/**
 * Freie mm-Positionierung von Trennstegen im Innenraum. Dicke ist an
 * `wallThicknessMm` gebunden. Position wird vom Innenraum-Ursprung gemessen.
 */
export function DividerEditor({
  widthCells,
  depthCells,
  heightMm,
  gridPitchMm = SYSTEM.gridPitchMm,
  wallThicknessMm = SYSTEM.wallThicknessMm,
  dividers,
  onChange
}: Props) {
  const t = useTranslations();
  const innerW = Math.max(0, widthCells * gridPitchMm - 2 * wallThicknessMm);
  const innerD = Math.max(0, depthCells * gridPitchMm - 2 * wallThicknessMm);
  const cavityH = Math.max(0, heightMm - SYSTEM.pickupTopZMm - SYSTEM.floorThicknessMm);
  const halfT = wallThicknessMm / 2;
  const atMax = dividers.length >= SYSTEM.maxDividersPerBox;

  function add(axis: "x" | "y") {
    if (atMax) return;
    const range = axis === "x" ? innerW : innerD;
    const center = range / 2;
    const offsetMm = Math.min(Math.max(halfT, center), range - halfT);
    onChange([
      ...dividers,
      {
        axis,
        offsetMm: round(offsetMm, 2),
        heightMm: round(cavityH, 2)
      }
    ]);
  }

  function update(index: number, patch: Partial<Divider>) {
    onChange(
      dividers.map((d, i) => {
        if (i !== index) return d;
        return { ...d, ...patch };
      })
    );
  }

  function remove(index: number) {
    onChange(dividers.filter((_, i) => i !== index));
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-100">{t("dividers.title")}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => add("x")}
            disabled={atMax || innerW < 2 * halfT || cavityH <= 0}
            className="rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-[11px] font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            + {t("dividers.addX")}
          </button>
          <button
            type="button"
            onClick={() => add("y")}
            disabled={atMax || innerD < 2 * halfT || cavityH <= 0}
            className="rounded-lg border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-[11px] font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            + {t("dividers.addY")}
          </button>
        </div>
      </div>

      {dividers.length === 0 ? (
        <p className="text-[11px] text-neutral-500">{t("dividers.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {dividers.map((d, idx) => {
            const range = d.axis === "x" ? innerW : innerD;
            const minOffset = round(halfT, 3);
            const maxOffset = round(range - halfT, 3);
            return (
              <li
                key={idx}
                className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1 text-xs text-neutral-300">
                    <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px]">
                      {d.axis === "x" ? t("dividers.axisXLabel") : t("dividers.axisYLabel")}
                    </span>
                    <button
                      type="button"
                      onClick={() => update(idx, { axis: d.axis === "x" ? "y" : "x" })}
                      className="rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:border-neutral-500"
                      aria-label={t("dividers.toggleAxis")}
                    >
                      ↔
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="rounded-full border border-red-800/60 bg-red-900/30 px-2 py-0.5 text-[11px] text-red-200 hover:bg-red-900/50"
                    aria-label={t("dividers.remove")}
                  >
                    ✕
                  </button>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                    {t("dividers.offsetLabel")}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={minOffset}
                      max={maxOffset}
                      step={0.1}
                      value={clamp(d.offsetMm, minOffset, maxOffset)}
                      onChange={(e) =>
                        update(idx, {
                          offsetMm: round(clamp(Number(e.target.value), minOffset, maxOffset), 2)
                        })
                      }
                      className="slotcrate-range flex-1"
                    />
                    <span className="w-16 text-right text-xs font-mono text-neutral-200">
                      {d.offsetMm.toFixed(1)} mm
                    </span>
                  </div>
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                    {t("dividers.heightLabel")}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={SYSTEM.minDividerHeightMm}
                      max={Math.max(SYSTEM.minDividerHeightMm, round(cavityH, 3))}
                      step={0.1}
                      value={clamp(d.heightMm, SYSTEM.minDividerHeightMm, cavityH)}
                      onChange={(e) =>
                        update(idx, {
                          heightMm: round(
                            clamp(Number(e.target.value), SYSTEM.minDividerHeightMm, cavityH),
                            2
                          )
                        })
                      }
                      className="slotcrate-range flex-1"
                    />
                    <span className="w-16 text-right text-xs font-mono text-neutral-200">
                      {d.heightMm.toFixed(1)} mm
                    </span>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[10px] text-neutral-500">
        {t("dividers.hint", { thickness: wallThicknessMm.toFixed(2) })}
      </p>
      <p className="text-[10px] text-neutral-500">{t("dividers.dragHint")}</p>
    </section>
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
