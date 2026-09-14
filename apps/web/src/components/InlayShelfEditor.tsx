"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SYSTEM } from "@/lib/system";
import type { InlayCutout } from "@/lib/schema";
import {
  DEFAULT_INLAY_LEVEL1_CUTOUTS,
  DEFAULT_INLAY_LEVEL2_CUTOUTS
} from "@/lib/schema";
import { InlayAutoPlacementWizard } from "./InlayAutoPlacementWizard";

interface Props {
  level: 1 | 2;
  cutouts: InlayCutout[];
  onChange: (cutouts: InlayCutout[]) => void;
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
  onOpenGlobalWizard?: () => void;
}

const TOTAL_W = SYSTEM.inlayWidthMm; // 57.4 mm
const TOTAL_D = SYSTEM.inlayDepthMm; // 224.6 mm
const MIN_MARGIN = SYSTEM.inlayMinMarginMm; // 2.6 mm
const CENTER_X = SYSTEM.inlayCenterXMm; // 28.7 mm

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function round(val: number, decimals: number = 1): number {
  const f = Math.pow(10, decimals);
  return Math.round(val * f) / f;
}

export function InlayShelfEditor({
  level,
  cutouts,
  onChange,
  activeIndex,
  onActiveIndexChange,
  onOpenGlobalWizard
}: Props) {
  const t = useTranslations();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMovedRef = useRef<boolean>(false);

  // Level-spezifische Grenzen
  const shelfXMin = level === 1 ? SYSTEM.inlayLevel1ShelfXMinMm : SYSTEM.inlayLevel2ShelfXMinMm; // 3.7 vs 8.0 mm
  const shelfXMax = level === 1 ? SYSTEM.inlayLevel1ShelfXMaxMm : SYSTEM.inlayLevel2ShelfXMaxMm; // 53.7 vs 49.4 mm
  const shelfYMin = level === 1 ? SYSTEM.inlayLevel1ShelfYMinMm : SYSTEM.inlayLevel2ShelfYMinMm; // 4.5 mm
  const shelfYMax = level === 1 ? SYSTEM.inlayLevel1ShelfYMaxMm : SYSTEM.inlayLevel2ShelfYMaxMm; // 224.6 vs 221.7 mm

  const boundXMin = shelfXMin + MIN_MARGIN; // L1: 6.3 mm, L2: 10.6 mm
  const boundXMax = shelfXMax - MIN_MARGIN; // L1: 51.1 mm, L2: 46.8 mm
  const boundYMin = shelfYMin + MIN_MARGIN; // 7.1 mm
  const boundYMax = shelfYMax - MIN_MARGIN; // L1: 222.0 mm, L2: 219.1 mm
  const maxPossibleDiameter = level === 1 ? SYSTEM.inlayLevel1MaxCutoutDiameterMm : SYSTEM.inlayLevel2MaxCutoutDiameterMm; // 42.0 vs 36.2 mm

  const activeCutout =
    activeIndex !== null && activeIndex >= 0 && activeIndex < cutouts.length
      ? cutouts[activeIndex]
      : null;

  const handleAdd = useCallback(() => {
    if (cutouts.length >= SYSTEM.inlayMaxCutoutsPerLevel) return;
    let nextY = boundYMin + 25;
    if (cutouts.length > 0) {
      const maxY = Math.max(...cutouts.map((c) => c.centerYMm));
      nextY = Math.min(boundYMax - 20, maxY + 35);
    }
    const defaultDia = level === 1 ? 41 : 32;
    const newCutout: InlayCutout = {
      diameterMm: Math.min(defaultDia, maxPossibleDiameter),
      centerXMm: CENTER_X,
      centerYMm: round(nextY, 1)
    };
    const next = [...cutouts, newCutout];
    onChange(next);
    onActiveIndexChange(next.length - 1);
  }, [cutouts, onChange, onActiveIndexChange, boundYMin, boundYMax, level, maxPossibleDiameter]);

  const handleUpdate = useCallback(
    (index: number, patch: Partial<InlayCutout>) => {
      const next = cutouts.map((c, i) => {
        if (i !== index) return c;

        // When diameter is changed: clamp diameter, then shift X/Y if needed so circle fits inside boundaries
        if (patch.diameterMm !== undefined && patch.centerXMm === undefined && patch.centerYMm === undefined) {
          const clampedDia = clamp(
            round(patch.diameterMm, 1),
            SYSTEM.inlayMinCutoutDiameterMm,
            maxPossibleDiameter
          );
          const r = clampedDia / 2.0;
          const shiftedX = clamp(c.centerXMm, boundXMin + r, boundXMax - r);
          const shiftedY = clamp(c.centerYMm, boundYMin + r, boundYMax - r);
          return {
            diameterMm: clampedDia,
            centerXMm: round(shiftedX, 1),
            centerYMm: round(shiftedY, 1)
          };
        }

        // When dragging or changing position: diameter stays intact, position is simply clamped to valid range
        const currentDia = patch.diameterMm !== undefined
          ? clamp(round(patch.diameterMm, 1), SYSTEM.inlayMinCutoutDiameterMm, maxPossibleDiameter)
          : c.diameterMm;
        const r = currentDia / 2.0;

        const targetX = patch.centerXMm !== undefined ? patch.centerXMm : c.centerXMm;
        const targetY = patch.centerYMm !== undefined ? patch.centerYMm : c.centerYMm;

        const clampedX = clamp(targetX, boundXMin + r, boundXMax - r);
        const clampedY = clamp(targetY, boundYMin + r, boundYMax - r);

        return {
          diameterMm: round(currentDia, 1),
          centerXMm: round(clampedX, 1),
          centerYMm: round(clampedY, 1)
        };
      });
      onChange(next);
    },
    [cutouts, onChange, boundXMin, boundXMax, boundYMin, boundYMax, maxPossibleDiameter]
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
      const targetY = Math.min(
        boundYMax - target.diameterMm / 2,
        target.centerYMm + target.diameterMm + 5
      );
      const newCutout: InlayCutout = {
        diameterMm: target.diameterMm,
        centerXMm: target.centerXMm,
        centerYMm: round(targetY, 1)
      };
      const next = [...cutouts, newCutout];
      onChange(next);
      onActiveIndexChange(next.length - 1);
    },
    [cutouts, onChange, onActiveIndexChange, boundYMax]
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

  const applyBottles41Preset = useCallback(() => {
    const next: InlayCutout[] = [
      { diameterMm: 41, centerXMm: CENTER_X, centerYMm: 30 },
      { diameterMm: 41, centerXMm: CENTER_X, centerYMm: 76 },
      { diameterMm: 41, centerXMm: CENTER_X, centerYMm: 122 },
      { diameterMm: 41, centerXMm: CENTER_X, centerYMm: 168 }
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
      { diameterMm: 25, centerXMm: 33.7, centerYMm: 51 },
      { diameterMm: 25, centerXMm: 23.7, centerYMm: 77 },
      { diameterMm: 25, centerXMm: 33.7, centerYMm: 103 },
      { diameterMm: 25, centerXMm: 23.7, centerYMm: 129 },
      { diameterMm: 25, centerXMm: 33.7, centerYMm: 155 },
      { diameterMm: 25, centerXMm: 23.7, centerYMm: 181 },
      { diameterMm: 25, centerXMm: 33.7, centerYMm: 207 }
    ];
    onChange(next);
    onActiveIndexChange(null);
  }, [onChange, onActiveIndexChange]);

  // Collisions between cutouts (minimum spacing 2.6 mm)
  const collidingIndices = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < cutouts.length; i++) {
      for (let j = i + 1; j < cutouts.length; j++) {
        const c1 = cutouts[i]!;
        const c2 = cutouts[j]!;
        const r1 = c1.diameterMm / 2.0;
        const r2 = c2.diameterMm / 2.0;
        const dist = Math.hypot(c1.centerXMm - c2.centerXMm, c1.centerYMm - c2.centerYMm);
        if (dist < r1 + r2 + MIN_MARGIN - 1e-4) {
          set.add(i);
          set.add(j);
        }
      }
    }
    return set;
  }, [cutouts]);

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
    dragMovedRef.current = false;
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
    dragMovedRef.current = true;
    const rawX = coords.x - dragOffset.x;
    const rawY = coords.y - dragOffset.y;
    handleUpdate(draggingIndex, {
      centerXMm: rawX,
      centerYMm: rawY
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingIndex !== null) {
      const idx = draggingIndex;
      setDraggingIndex(null);
      // Ensure the moved item stays selected
      onActiveIndexChange(idx);
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        // Fallback
      }
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (!dragMovedRef.current) {
      onActiveIndexChange(null);
    }
    dragMovedRef.current = false;
  };

  const commonSizes = level === 1 ? [15, 20, 25, 30, 32, 36, 41, 42] : [15, 20, 25, 30, 32, 36];

  return (
    <div className="space-y-4">
      {/* Preset & Wizard Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {onOpenGlobalWizard && (
          <button
            type="button"
            onClick={onOpenGlobalWizard}
            className="slotcrate-button-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-md"
          >
            <span>🪄</span>
            <span>{t("inlay.wizard.button")}</span>
          </button>
        )}

        {onOpenGlobalWizard && <span className="text-white/30 hidden sm:inline">|</span>}

        <span className="text-xs text-white/60">{t("inlay.presets.title")}:</span>
        <button
          type="button"
          onClick={applyReferencePreset}
          className="slotcrate-button-secondary text-xs py-1 px-2.5"
        >
          {t("inlay.presets.reference")}
        </button>
        {level === 1 ? (
          <button
            type="button"
            onClick={applyBottles41Preset}
            className="slotcrate-button-secondary text-xs py-1 px-2.5"
          >
            {t("inlay.presets.bottles41")}
          </button>
        ) : (
          <button
            type="button"
            onClick={applyBottles32Preset}
            className="slotcrate-button-secondary text-xs py-1 px-2.5"
          >
            {t("inlay.presets.bottles32")}
          </button>
        )}
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
            {t("inlay.editor.shelfPlan")} ({TOTAL_W} × {TOTAL_D} mm · {t("inlay.levelLabel", { level })})
          </div>
          <div className="relative border border-white/20 rounded-2xl p-3 bg-black/60 shadow-inner flex justify-center">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${TOTAL_W} ${TOTAL_D}`}
              className="h-[380px] w-auto select-none touch-none cursor-crosshair drop-shadow-md"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={handleBackgroundClick}
            >
              {/* Outer shelf frame */}
              <rect
                x="0"
                y="0"
                width={TOTAL_W}
                height={TOTAL_D}
                rx="2"
                fill="#121812"
                stroke="#243024"
                strokeWidth="1"
              />

              {/* Shelf physical edges */}
              <rect
                x={shelfXMin}
                y={shelfYMin}
                width={shelfXMax - shelfXMin}
                height={shelfYMax - shelfYMin}
                fill="#070a07"
                stroke="#3f8f1c"
                strokeWidth="0.5"
                opacity="0.6"
              />

              {/* Usable zone (reflecting 2.6mm margin limit) */}
              <rect
                x={boundXMin}
                y={boundYMin}
                width={boundXMax - boundXMin}
                height={boundYMax - boundYMin}
                fill="none"
                stroke="#7ed321"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.8"
              />

              {/* Center guide line */}
              <line
                x1={CENTER_X}
                y1="0"
                x2={CENTER_X}
                y2={TOTAL_D}
                stroke="#5fbb2e"
                strokeWidth="0.4"
                strokeDasharray="1,2"
                opacity="0.4"
              />

              {/* Cutouts */}
              {cutouts.map((cutout, idx) => {
                const isActive = activeIndex === idx;
                const isColliding = collidingIndices.has(idx);
                const r = cutout.diameterMm / 2;
                const strokeColor = isColliding ? "#e2483b" : isActive ? "#7ed321" : "#58a6ff";
                const fillColor = isColliding
                  ? "rgba(226, 72, 59, 0.35)"
                  : isActive
                  ? "rgba(126, 211, 33, 0.35)"
                  : "rgba(88, 166, 255, 0.25)";
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
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isActive || isColliding ? "1.4" : "0.8"}
                      className="transition-colors duration-150"
                    />
                    {/* Center crosshair */}
                    <line
                      x1={cutout.centerXMm - 2}
                      y1={cutout.centerYMm}
                      x2={cutout.centerXMm + 2}
                      y2={cutout.centerYMm}
                      stroke={strokeColor}
                      strokeWidth="0.5"
                    />
                    <line
                      x1={cutout.centerXMm}
                      y1={cutout.centerYMm - 2}
                      x2={cutout.centerXMm}
                      y2={cutout.centerYMm + 2}
                      stroke={strokeColor}
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
          {collidingIndices.size > 0 && (
            <div className="mt-2 w-full p-2.5 rounded-xl border border-red-500/30 bg-red-950/40 text-xs text-red-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{t("inlay.editor.collisionWarning")}</span>
            </div>
          )}
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
            <div className="rounded-2xl border border-[#5fbb2e]/40 bg-[#0d160d]/80 p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7ed321] flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#7ed321] animate-pulse" />
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
                  <span className="font-mono font-semibold text-[#7ed321]">
                    {activeCutout.diameterMm} mm{" "}
                    <span className="text-white/40 font-normal">
                      (max. {maxPossibleDiameter} mm)
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={SYSTEM.inlayMinCutoutDiameterMm}
                    max={maxPossibleDiameter}
                    step={0.5}
                    value={activeCutout.diameterMm}
                    onChange={(e) =>
                      handleUpdate(activeIndex, { diameterMm: parseFloat(e.target.value) })
                    }
                    className="flex-1 accent-[#7ed321] cursor-pointer"
                  />
                  <input
                    type="number"
                    min={SYSTEM.inlayMinCutoutDiameterMm}
                    max={maxPossibleDiameter}
                    step={0.5}
                    value={activeCutout.diameterMm}
                    onChange={(e) =>
                      handleUpdate(activeIndex, { diameterMm: parseFloat(e.target.value) || 10 })
                    }
                    className="slotcrate-input w-24 text-xs text-center py-1 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Quick Size Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-white/60">{t("inlay.editor.commonSizes")}:</span>
                {commonSizes.map((dia) => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => handleUpdate(activeIndex, { diameterMm: dia })}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      activeCutout.diameterMm === dia
                        ? "bg-[#5fbb2e]/30 text-[#7ed321] border border-[#5fbb2e]/50 font-bold"
                        : "bg-white/10 hover:bg-white/20 text-white/90"
                    }`}
                  >
                    {dia}mm
                  </button>
                ))}
              </div>

              {/* X & Y Coordinates */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/80">
                    <span>X ({t("inlay.editor.width")}):</span>
                    <button
                      type="button"
                      onClick={() => handleUpdate(activeIndex, { centerXMm: CENTER_X })}
                      className="text-[10px] text-[#7ed321] hover:underline"
                    >
                      {t("inlay.editor.center")}
                    </button>
                  </div>
                  <input
                    type="number"
                    min={boundXMin + activeCutout.diameterMm / 2}
                    max={boundXMax - activeCutout.diameterMm / 2}
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
                    min={boundYMin + activeCutout.diameterMm / 2}
                    max={boundYMax - activeCutout.diameterMm / 2}
                    step={0.5}
                    value={activeCutout.centerYMm}
                    onChange={(e) =>
                      handleUpdate(activeIndex, { centerYMm: parseFloat(e.target.value) || boundYMin })
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
                        isSel
                          ? "bg-[#5fbb2e]/20 text-white border-l-2 border-[#7ed321]"
                          : "hover:bg-white/5 text-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white/50 w-5">#{i + 1}</span>
                        <span className="font-semibold text-[#7ed321] font-mono">
                          ø {c.diameterMm} mm
                        </span>
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
