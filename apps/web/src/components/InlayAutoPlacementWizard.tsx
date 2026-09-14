"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SYSTEM } from "@/lib/system";
import {
  calculateDualLevelPlacement,
  type InlayDemandItem
} from "@/lib/inlay-auto-placement";
import type { InlayCutout } from "@/lib/schema";

interface Props {
  open: boolean;
  existingLevel1Cutouts: InlayCutout[];
  existingLevel2Cutouts: InlayCutout[];
  onApply(level1Cutouts: InlayCutout[], level2Cutouts: InlayCutout[]): void;
  onClose(): void;
}

const COMMON_DIAMETERS = [15, 20, 25, 30, 32, 36, 41, 42] as const;

export function InlayAutoPlacementWizard({
  open,
  existingLevel1Cutouts,
  existingLevel2Cutouts,
  onApply,
  onClose
}: Props) {
  const t = useTranslations();
  const [items, setItems] = useState<InlayDemandItem[]>([
    { id: "row-1", diameterMm: 41, count: 2 },
    { id: "row-2", diameterMm: 32, count: 3 },
    { id: "row-3", diameterMm: 25, count: 4 }
  ]);
  const [mode, setMode] = useState<"replace" | "append">("replace");

  const placement = useMemo(
    () =>
      calculateDualLevelPlacement(
        items,
        existingLevel1Cutouts,
        existingLevel2Cutouts,
        mode
      ),
    [items, existingLevel1Cutouts, existingLevel2Cutouts, mode]
  );

  if (!open) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        diameterMm: 25,
        count: 1
      }
    ]);
  };

  const handleUpdateItem = (id: string, patch: Partial<InlayDemandItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApply = () => {
    onApply(placement.level1Cutouts, placement.level2Cutouts);
    onClose();
  };

  const totalExisting = existingLevel1Cutouts.length + existingLevel2Cutouts.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/20 bg-[#0c100c] p-6 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">🪄</span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {t("inlay.wizard.title")}
              </h2>
            </div>
            <p className="text-xs text-white/70 mt-1">
              {t("inlay.wizard.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Mode Selector (Replace vs Append) */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/60">{t("inlay.wizard.modeLabel")}:</span>
            <div className="flex rounded-xl border border-white/15 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setMode("replace")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  mode === "replace"
                    ? "bg-[#5fbb2e] text-black font-semibold"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {t("inlay.wizard.modeReplace")}
              </button>
              <button
                type="button"
                onClick={() => setMode("append")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  mode === "append"
                    ? "bg-[#5fbb2e] text-black font-semibold"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {t("inlay.wizard.modeAppend")} ({totalExisting} {t("inlay.specs.pieces")})
              </button>
            </div>
          </div>

          {/* Requested Items Form */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/90">
                {t("inlay.wizard.itemsTitle")}
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-[#7ed321] hover:text-[#98eb4b] underline flex items-center gap-1"
              >
                <span>+</span>
                <span>{t("inlay.wizard.addItem")}</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-xs text-white/40">
                {t("inlay.wizard.noItemsHint")}
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl border border-white/10 bg-white/5"
                  >
                    <span className="text-xs font-mono text-white/40 w-6">
                      #{index + 1}
                    </span>

                    {/* Diameter input & presets */}
                    <div className="flex-1 flex items-center gap-2">
                      <label className="text-xs text-white/70 whitespace-nowrap">
                        ø:
                      </label>
                      <input
                        type="number"
                        min={SYSTEM.inlayMinCutoutDiameterMm}
                        max={SYSTEM.inlayLevel1MaxCutoutDiameterMm}
                        step={0.5}
                        value={item.diameterMm}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            diameterMm: parseFloat(e.target.value) || 10
                          })
                        }
                        className="slotcrate-input w-20 text-xs text-center py-1 font-mono font-semibold"
                      />
                      <span className="text-xs text-white/50">mm</span>

                      <div className="hidden sm:flex items-center gap-1 ml-auto">
                        {COMMON_DIAMETERS.map((dia) => (
                          <button
                            key={dia}
                            type="button"
                            onClick={() => handleUpdateItem(item.id, { diameterMm: dia })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              item.diameterMm === dia
                                ? "bg-[#5fbb2e]/30 text-[#7ed321] border border-[#5fbb2e]/50 font-bold"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                          >
                            {dia}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 justify-end">
                      <label className="text-xs text-white/70 whitespace-nowrap">
                        {t("inlay.wizard.count")}:
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateItem(item.id, {
                            count: Math.max(1, item.count - 1)
                          })
                        }
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={item.count}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            count: Math.max(1, parseInt(e.target.value) || 1)
                          })
                        }
                        className="slotcrate-input w-14 text-xs text-center py-1 font-mono font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateItem(item.id, { count: item.count + 1 })
                        }
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white font-bold"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-400 hover:text-red-300 p-1 ml-1"
                        title={t("inlay.editor.delete")}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Level Distribution & Real-time Capacity Gauges */}
          <div className="rounded-2xl border border-white/15 bg-black/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/90">
                {t("inlay.wizard.capacityTitle")}
              </span>
              <span
                className={`font-mono font-bold ${
                  placement.fitsAll ? "text-[#7ed321]" : "text-red-400"
                }`}
              >
                {placement.occupancyPercent}% {t("inlay.wizard.occupied")} (Gesamt)
              </span>
            </div>

            {/* Level 1 & Level 2 Detailed Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/80 font-semibold">{t("inlay.level1Tab")} (bis 42 mm):</span>
                  <span className="font-mono text-[#7ed321] font-bold">
                    {placement.level1Cutouts.length} Stk. ({placement.level1OccupancyPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5fbb2e] to-[#7ed321] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, placement.level1OccupancyPercent)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/80 font-semibold">{t("inlay.level2Tab")} (bis 36.2 mm):</span>
                  <span className="font-mono text-[#7ed321] font-bold">
                    {placement.level2Cutouts.length} Stk. ({placement.level2OccupancyPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5fbb2e] to-[#7ed321] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, placement.level2OccupancyPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Validation Message */}
            {placement.totalRequestedCount === 0 ? (
              <p className="text-xs text-white/50">
                {t("inlay.wizard.enterItemsPrompt")}
              </p>
            ) : placement.fitsAll ? (
              <div className="flex items-center gap-2 text-xs text-[#7ed321]">
                <span>✅</span>
                <span>
                  {t("inlay.wizard.fitsAllSuccess", {
                    count: placement.placedCount
                  })}
                </span>
              </div>
            ) : (
              <div className="space-y-1 text-xs text-red-300">
                <div className="flex items-center gap-2 font-semibold text-red-400">
                  <span>⚠️</span>
                  <span>
                    {t("inlay.wizard.overflowWarning", {
                      unplaced: placement.unplacedCount
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-white/60">
                  {t("inlay.wizard.overflowDetail", {
                    placed: placement.placedCount,
                    total: placement.totalRequestedCount
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="slotcrate-button-secondary text-xs py-2 px-4"
          >
            {t("inlay.wizard.cancel")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={placement.placedCount === 0}
            className="slotcrate-button-primary text-xs py-2 px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>✨</span>
            <span>{t("inlay.wizard.apply")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
