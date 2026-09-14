"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SYSTEM } from "@/lib/system";
import type { InlayCutout } from "@/lib/schema";
import {
  DEFAULT_INLAY_LEVEL1_CUTOUTS,
  DEFAULT_INLAY_LEVEL2_CUTOUTS
} from "@/lib/schema";

interface Props {
  level: 1 | 2;
  cutouts: InlayCutout[];
  onChange: (cutouts: InlayCutout[]) => void;
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
}

const TOTAL_W = SYSTEM.inlayWidthMm; // 57.4 mm
const TOTAL_D = SYSTEM.inlayDepthMm; // 224.6 mm
const SHELF_X_MIN = SYSTEM.inlayShelfUsableXMinMm; // 8.0 mm
const SHELF_X_MAX = SYSTEM.inlayShelfUsableXMaxMm; // 49.4 mm
const SHELF_Y_MIN = SYSTEM.inlayShelfUsableYMinMm; // 5.0 mm
const SHELF_Y_MAX = SYSTEM.inlayShelfUsableYMaxMm; // 218.0 mm
const MIN_MARGIN = SYSTEM.inlayMinMarginMm; // 2.6 mm
const CENTER_X = SYSTEM.inlayCenterXMm; // 28.7 mm

// Permissible boundary box for any cutout's outermost circle edge
const BOUND_X_MIN = SHELF_X_MIN + MIN_MARGIN; // 10.6 mm
const BOUND_X_MAX = SHELF_X_MAX - MIN_MARGIN; // 46.8 mm
const BOUND_Y_MIN = SHELF_Y_MIN + MIN_MARGIN; // 7.6 mm
const BOUND_Y_MAX = SHELF_Y_MAX - MIN_MARGIN; // 215.4 mm

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function round(val: number, decimals: number = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(val * f) / f;
}

export function InlayShelfEditor({
  level,
  cutouts,
  onChange,
  activeIndex,
  onActiveIndexChange
}: Props) {
  const t = useTranslations();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeCutout = activeIndex !== null && activeIndex >= 0 && activeIndex < cutouts.length
    ? cutouts[activeIndex]
    : null;

  // Calculate maximum allowable diameter for a hole at a given (x, y) center
  const getMaxDiameterAt = useCallback((cx: number, cy: number): number => {
    const maxRadius = Math.min(
      cx - BOUND_X_MIN,
      BOUND_X_MAX - cx,
      cy - BOUND_Y_MIN,
      BOUND_Y_MAX - cy
    );
    return Math.max(
      SYSTEM.inlayMinCutoutDiameterMm,
      Math.min(SYSTEM.inlayMaxCutoutDiameterMm, round(2 * maxRadius, 1))
    );
  }, []);

  const handleAdd = useCallback(() => {
    if (cutouts.length >= SYSTEM.inlayMaxCutoutsPerLevel) return;
    let nextY = BOUND_Y_MIN + 25;
    if (cutouts.length > 0) {
      const maxY = Math.max(...cutouts.map((c) => c.centerYMm));
      nextY = Math.min(BOUND_Y_MAX - 20, maxY + 35);
    }
    const maxDia = getMaxDiameterAt(CENTER_X, nextY);
    const newCutout: InlayCutout = {
      diameterMm: Math.min(32, maxDia),
      centerXMm: CENTER_X,
      centerYMm: round(nextY, 1)
    };
    const next = [...cutouts, newCutout];
    onChange(next);
    onActiveIndexChange(next.length - 1);
  }, [cutouts, onChange, onActiveIndexChange, getMaxDiameterAt]);

  const handleUpdate = useCallback(
    (index: number, patch: Partial<InlayCutout>) => {
      const next = cutouts.map((c, i) => {
        if (i !== index) return c;
        const targetDia = patch.diameterMm !== undefined ? patch.diameterMm : c.diameterMm;
        const targetX = patch.centerXMm !== undefined ? patch.centerXMm : c.centerXMm;
        const targetY = patch.centerYMm !== undefined ? patch.centerYMm : c.centerYMm;

        // Preliminary clamp of coordinates to interior region
        const clampedX = clamp(round(targetX, 1), BOUND_X_MIN + 2.5, BOUND_X_MAX - 2.5);
        const clampedY = clamp(round(targetY, 1), BOUND_Y_MIN + 2.5, BOUND_Y_MAX - 2.5);

        // Max possible diameter at this center position
        const maxDia = getMaxDiameterAt(clampedX, clampedY);
        const clampedDia = clamp(
          round(targetDia, 1),
          SYSTEM.inlayMinCutoutDiameterMm,
          maxDia
        );

        // Re-clamp center coordinates with the final chosen radius
        const radius = clampedDia / 2.0;
        const finalX = clamp(clampedX, BOUND_X_MIN + radius, BOUND_X_MAX - radius);
        const finalY = clamp(clampedY, BOUND_Y_MIN + radius, BOUND_Y_MAX - radius);

        return {
          diameterMm: round(clampedDia, 1),
          centerXMm: round(finalX, 1),
          centerYMm: round(finalY, 1)
        };
      });
      onChange(next);
    },
    [cutouts, onChange, getMaxDiameterAt]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const next = cutouts.filter((_, i) => i !== index);
      onChange(next);
      if (activeIndex === index) {
        onActiveIndexChange(null);
      } else if (activeIndex !== null && activeIndex > index) {
        onActiveIndexChange(activeIndex - 1);
      }
    },
    [cutouts, activeIndex, onChange, onActiveIndexChange]
  );

  const handleDuplicate = useCallback(
    (index: number) => {
      if (cutouts.length >= SYSTEM.inlayMaxCutoutsPerLevel) return;
      const target = cutouts[index];
      if (!target) return;
      const targetY = Math.min(BOUND_Y_MAX - target.diameterMm / 2, target.centerYMm + target.diameterMm + 5);
      const newCutout: InlayCutout = {
        diameterMm: target.diameterMm,
        centerXMm: target.centerXMm,
        centerYMm: round(targetY, 1)
      };
      const next = [...cutouts, newCutout];
      onChange(next);
      onActiveIndexChange(next.length - 1);
    },
    [cutouts, onChange, onActiveIndexChange]
  );

  // Presets
  const applyReferencePreset = useCallback(() => {
    const preset = level === 1 ? DEFAULT_INLAY_LEVEL1_CUTOUTS : DEFAULT_INLAY_LEVEL2_CUTOUTS;
    onChange(preset);
    onActiveIndexChange(null);
  }, [level, onChange, onActiveIndexChange]);

  const applyClearPreset = useCallback(() => {
    onChange([]);
    onActiveIndexChange(null);
  }, [onChange, onActiveIndexChange]);

  const applyBottles36Preset = useCallback(() => {
    const next: InlayCutout[] = [
      { diameterMm: 36, centerXMm: CENTER_X, centerYMm: 30 },
      { diameterMm: 36, centerXMm: CENTER_X, centerYMm: 76 },
      { diameterMm: 36, centerXMm: CENTER_X, centerYMm: 122 },
      { diameterMm: 36, centerXMm: CENTER_X, centerYMm: 168 }
    ];
    onChange(next);
    onActiveIndexChange(null);
  }, [onChange, onActiveIndexChange]);

  const applyBottles32Preset = useCallback(() => {
    const next: InlayCutout[] = [
      { diameterMm: 32, centerXMm: CENTER_X, centerYMm: 28 },
      { diameterMm: 32, centerXMm: CENTER_X, centerYMm: 65 },
      { diameterMm: 32, centerXMm: CENTER_X, centerYMm: 102 },
      { diameterMm: 32, centerXMm: CENTER_X, centerYMm: 139 },
      { diameterMm: 32, centerXMm: CENTER_X, centerYMm: 176 }
    ];
    onChange(next);
    onActiveIndexChange(null);
  }, [onChange, onActiveIndexChange]);

  const applyVialsZigzagPreset = useCallback(() => {
    const next: InlayCutout[] = [
      { diameterMm: 25, centerXMm: 23.7, centerYMm: 25 },
      { diameterMm: 25, centerXMm: 33.7, centerYMm: 50 },
      { diameterMm: 25, centerXMm: 23.7, centerYMm: 75 },
      { diameterMm: 25, centerXMm: 33.7, centerYMm: 100 },
      { diameterMm: 25, centerXMm: 23.7, centerYMm: 125 },
      { diameterMm: 25, centerXMm: 33.7, centerYMm: 150 },
      { diameterMm: 25, centerXMm: 23.7, centerYMm: 175 },
      { diameterMm: 25, centerXMm: 33.7, centerYMm: 200 }
    ];
    onChange(next);
    onActiveIndexChange(null);
  }, [onChange, onActiveIndexChange]);

  // SVG Drag & Drop
  const getSvgMmCoords = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    return {
      x: px * TOTAL_W,
      y: py * TOTAL_D
    };
  };

  const handlePointerDownCutout = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    onActiveIndexChange(index);
    const coords = getSvgMmCoords(e as unknown as React.PointerEvent<SVGSVGElement>);
    if (coords && cutouts[index]) {
      setDraggingIndex(index);
      setDragOffset({
        x: coords.x - cutouts[index]!.centerXMm,
        y: coords.y - cutouts[index]!.centerYMm
      });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingIndex === null || !cutouts[draggingIndex]) return;
    const coords = getSvgMmCoords(e);
    if (!coords) return;
    const rawX = coords.x - dragOffset.x;
    const rawY = coords.y - dragOffset.y;
    handleUpdate(draggingIndex, {
      centerXMm: rawX,
      centerYMm: rawY
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingIndex !== null) {
      setDraggingIndex(null);
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        // Fallback
      }
    }
  };

  // Max diameter for currently selected cutout
  const activeMaxDia = activeCutout
    ? getMaxDiameterAt(activeCutout.centerXMm, activeCutout.centerYMm)
    : SYSTEM.inlayMaxCutoutDiameterMm;

  return (
    <div className="space-y-4">
      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/60">{t("inlay.presets.title")}:</span>
        <button
          type="button"
          onClick={applyReferencePreset}
          className="slotcrate-button-secondary text-xs py-1 px-2.5"
        >
          {t("inlay.presets.reference")}
        </button>
        <button
          type="button"
          onClick={applyBottles36Preset}
          className="slotcrate-button-secondary text-xs py-1 px-2.5"
        >
          {t("inlay.presets.bottles36")}
        </button>
        <button
          type="button"
          onClick={applyBottles32Preset}
          className="slotcrate-button-secondary text-xs py-1 px-2.5"
        >
          {t("inlay.presets.bottles32")}
        </button>
        <button
          type="button"
          onClick={applyVialsZigzagPreset}
          className="slotcrate-button-secondary text-xs py-1 px-2.5"
        >
          {t("inlay.presets.vialsZigzag")}
        </button>
        <button
          type="button"
          onClick={applyClearPreset}
          className="slotcrate-button-secondary text-xs py-1 px-2.5 text-red-400 hover:text-red-300"
        >
          {t("inlay.presets.clear")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 2D SVG Shelf View */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-xs text-white/70 mb-2 font-mono">
            {t("inlay.editor.shelfPlan")} ({TOTAL_W} × {TOTAL_D} mm)
          </div>
          <div className="relative border border-white/20 rounded-2xl p-3 bg-black/60 shadow-inner flex justify-center">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${TOTAL_W} ${TOTAL_D}`}
              className="h-[380px] w-auto select-none touch-none cursor-crosshair drop-shadow-md"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={() => onActiveIndexChange(null)}
            >
              {/* Outer shelf frame */}
              <rect
                x="0"
                y="0"
                width={TOTAL_W}
                height={TOTAL_D}
                rx="2"
                fill="#161b22"
                stroke="#30363d"
                strokeWidth="1"
              />

              {/* Shelf physical edges */}
              <rect
                x={SHELF_X_MIN}
                y={SHELF_Y_MIN}
                width={SHELF_X_MAX - SHELF_X_MIN}
                height={SHELF_Y_MAX - SHELF_Y_MIN}
                fill="#0d1117"
                stroke="#484f58"
                strokeWidth="0.5"
              />

              {/* Usable zone (reflecting 2.6mm margin limit) */}
              <rect
                x={BOUND_X_MIN}
                y={BOUND_Y_MIN}
                width={BOUND_X_MAX - BOUND_X_MIN}
                height={BOUND_Y_MAX - BOUND_Y_MIN}
                fill="none"
                stroke="#ff7b00"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.75"
              />

              {/* Center guide line */}
              <line
                x1={CENTER_X}
                y1="0"
                x2={CENTER_X}
                y2={TOTAL_D}
                stroke="#58a6ff"
                strokeWidth="0.4"
                strokeDasharray="1,2"
                opacity="0.5"
              />

              {/* Cutouts */}
              {cutouts.map((cutout, idx) => {
                const isActive = activeIndex === idx;
                const r = cutout.diameterMm / 2;
                return (
                  <g
                    key={idx}
                    className="cursor-move group"
                    onPointerDown={(e) => handlePointerDownCutout(e, idx)}
                  >
                    {/* Circle fill & stroke */}
                    <circle
                      cx={cutout.centerXMm}
                      cy={cutout.centerYMm}
                      r={r}
                      fill={isActive ? "rgba(255, 123, 0, 0.35)" : "rgba(88, 166, 255, 0.25)"}
                      stroke={isActive ? "#ff7b00" : "#58a6ff"}
                      strokeWidth={isActive ? "1.2" : "0.8"}
                      className="transition-colors duration-150"
                    />
                    {/* Center crosshair */}
                    <line
                      x1={cutout.centerXMm - 2}
                      y1={cutout.centerYMm}
                      x2={cutout.centerXMm + 2}
                      y2={cutout.centerYMm}
                      stroke={isActive ? "#ff7b00" : "#ffffff"}
                      strokeWidth="0.5"
                    />
                    <line
                      x1={cutout.centerXMm}
                      y1={cutout.centerYMm - 2}
                      x2={cutout.centerXMm}
                      y2={cutout.centerYMm + 2}
                      stroke={isActive ? "#ff7b00" : "#ffffff"}
                      strokeWidth="0.5"
                    />
                    {/* Label diameter */}
                    <text
                      x={cutout.centerXMm}
                      y={cutout.centerYMm + 1.2}
                      textAnchor="middle"
                      fontSize="4.5"
                      fill="#ffffff"
                      fontWeight="bold"
                      className="pointer-events-none select-none font-mono"
                    >
                      ø{cutout.diameterMm}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="text-[11px] text-white/50 mt-2 text-center">
            {t("inlay.editor.dragHint")} ({t("inlay.editor.marginHint")})
          </p>
        </div>

        {/* Cutout List & Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/90">
              {t("inlay.editor.cutoutsList")} ({cutouts.length}/{SYSTEM.inlayMaxCutoutsPerLevel})
            </h3>
            <button
              type="button"
              onClick={handleAdd}
              disabled={cutouts.length >= SYSTEM.inlayMaxCutoutsPerLevel}
              className="slotcrate-button-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <span>+</span>
              <span>{t("inlay.editor.addCutout")}</span>
            </button>
          </div>

          {/* Active Cutout Detail Inspector */}
          {activeCutout && activeIndex !== null ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400">
                  {t("inlay.editor.editCutout")} #{activeIndex + 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(activeIndex)}
                    className="text-xs text-white/70 hover:text-white underline"
                  >
                    {t("inlay.editor.duplicate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(activeIndex)}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    {t("inlay.editor.delete")}
                  </button>
                </div>
              </div>

              {/* Diameter Slider & Input */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-white/80">
                  <span>{t("inlay.editor.diameter")} (mm):</span>
                  <span className="font-mono font-semibold text-amber-300">
                    {activeCutout.diameterMm} mm{" "}
                    <span className="text-white/40 font-normal">
                      (max. {activeMaxDia} mm)
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={SYSTEM.inlayMinCutoutDiameterMm}
                    max={activeMaxDia}
                    step={0.5}
                    value={activeCutout.diameterMm}
                    onChange={(e) =>
                      handleUpdate(activeIndex, { diameterMm: parseFloat(e.target.value) })
                    }
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={SYSTEM.inlayMinCutoutDiameterMm}
                    max={activeMaxDia}
                    step={0.5}
                    value={activeCutout.diameterMm}
                    onChange={(e) =>
                      handleUpdate(activeIndex, { diameterMm: parseFloat(e.target.value) || 10 })
                    }
                    className="slotcrate-input w-24 text-xs text-center py-1 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Quick Size Presets (only show ones that fit) */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-white/60">{t("inlay.editor.commonSizes")}:</span>
                {[15, 20, 25, 30, 32, 36].map((dia) => {
                  const fits = dia <= activeMaxDia;
                  return (
                    <button
                      key={dia}
                      type="button"
                      disabled={!fits}
                      onClick={() => handleUpdate(activeIndex, { diameterMm: dia })}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        fits
                          ? "bg-white/10 hover:bg-white/20 text-white/90 cursor-pointer"
                          : "bg-white/5 text-white/30 cursor-not-allowed opacity-50"
                      }`}
                    >
                      {dia}mm
                    </button>
                  );
                })}
              </div>

              {/* X & Y Coordinates */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/80">
                    <span>X ({t("inlay.editor.width")}):</span>
                    <button
                      type="button"
                      onClick={() => handleUpdate(activeIndex, { centerXMm: CENTER_X })}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      {t("inlay.editor.center")}
                    </button>
                  </div>
                  <input
                    type="number"
                    min={BOUND_X_MIN + activeCutout.diameterMm / 2}
                    max={BOUND_X_MAX - activeCutout.diameterMm / 2}
                    step={0.5}
                    value={activeCutout.centerXMm}
                    onChange={(e) =>
                      handleUpdate(activeIndex, { centerXMm: parseFloat(e.target.value) || CENTER_X })
                    }
                    className="slotcrate-input w-full text-xs py-1 font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/80">
                    <span>Y ({t("inlay.editor.depth")}):</span>
                  </div>
                  <input
                    type="number"
                    min={BOUND_Y_MIN + activeCutout.diameterMm / 2}
                    max={BOUND_Y_MAX - activeCutout.diameterMm / 2}
                    step={0.5}
                    value={activeCutout.centerYMm}
                    onChange={(e) =>
                      handleUpdate(activeIndex, { centerYMm: parseFloat(e.target.value) || BOUND_Y_MIN })
                    }
                    className="slotcrate-input w-full text-xs py-1 font-mono font-semibold"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60 text-center">
              {t("inlay.editor.noSelectionHint")}
            </div>
          )}

          {/* Table / List of all cutouts */}
          {cutouts.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
              <div className="max-h-48 overflow-y-auto divide-y divide-white/5 text-xs">
                {cutouts.map((c, i) => {
                  const isSel = activeIndex === i;
                  return (
                    <div
                      key={i}
                      onClick={() => onActiveIndexChange(i)}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                        isSel ? "bg-amber-500/20 text-white" : "hover:bg-white/5 text-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white/50 w-5">#{i + 1}</span>
                        <span className="font-semibold text-amber-400 font-mono">ø {c.diameterMm} mm</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white/60 font-mono text-[11px]">
                          X: {c.centerXMm} / Y: {c.centerYMm} mm
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(i);
                          }}
                          className="text-red-400 hover:text-red-300 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-white/40 text-xs">
              {t("inlay.editor.emptyLevel")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
