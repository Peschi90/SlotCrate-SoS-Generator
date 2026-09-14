"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Inlay3DPreview } from "@/components/Inlay3DPreview";
import { InlayShelfEditor } from "@/components/InlayShelfEditor";
import {
  DEFAULT_INLAY_LEVEL1_CUTOUTS,
  DEFAULT_INLAY_LEVEL2_CUTOUTS,
  type InlayCutout
} from "@/lib/schema";
import { SYSTEM } from "@/lib/system";

export function InlayGeneratorClient() {
  const t = useTranslations();
  const [level1Cutouts, setLevel1Cutouts] = useState<InlayCutout[]>(DEFAULT_INLAY_LEVEL1_CUTOUTS);
  const [level2Cutouts, setLevel2Cutouts] = useState<InlayCutout[]>(DEFAULT_INLAY_LEVEL2_CUTOUTS);
  const [activeLevel, setActiveLevel] = useState<1 | 2>(1);
  const [activeCutoutIndex, setActiveCutoutIndex] = useState<number | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const busy = downloading || pending;

  const handleLevelSwitch = (level: 1 | 2) => {
    setActiveLevel(level);
    setActiveCutoutIndex(null);
  };

  const handleDownloadStl = async () => {
    setError(null);
    setDownloading(true);
    try {
      const res = await fetch("/api/inlay/stl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level1Cutouts,
          level2Cutouts
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SlotCrate_MM_Inlay.stl";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message || t("inlay.downloadError"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-mono">
              {t("inlay.badge")}
            </span>
            <span className="text-white/40">·</span>
            <span className="text-xs text-white/60 font-mono">
              {SYSTEM.inlayWidthMm} × {SYSTEM.inlayDepthMm} × {SYSTEM.inlayHeightMm} mm
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
            {t("inlay.title")}
          </h1>
          <p className="text-sm text-white/70 max-w-2xl mt-1">
            {t("inlay.description")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadStl}
            disabled={busy}
            className="slotcrate-button-primary flex items-center gap-2 text-sm py-2.5 px-6 shadow-lg hover:shadow-amber-500/20"
          >
            {busy ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                <span>{t("inlay.generatingStl")}</span>
              </>
            ) : (
              <>
                <span>⬇</span>
                <span>{t("inlay.downloadStl")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Main Grid: 3D View & Configuration Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Top: 3D Live Viewport */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="rounded-3xl border border-white/15 bg-black/40 backdrop-blur-md overflow-hidden h-[420px] lg:h-[520px] relative shadow-2xl">
            <Inlay3DPreview
              level1Cutouts={level1Cutouts}
              level2Cutouts={level2Cutouts}
              activeLevel={activeLevel}
              activeCutoutIndex={activeCutoutIndex}
            />
          </div>

          {/* Quick Specs / Stats */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs space-y-2">
            <div className="font-semibold text-white/90">{t("inlay.specs.title")}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-white/70 font-mono text-[11px]">
              <div>
                <span className="text-white/40 block">{t("inlay.specs.level1Cutouts")}</span>
                {level1Cutouts.length} {t("inlay.specs.pieces")}
              </div>
              <div>
                <span className="text-white/40 block">{t("inlay.specs.level2Cutouts")}</span>
                {level2Cutouts.length} {t("inlay.specs.pieces")}
              </div>
              <div>
                <span className="text-white/40 block">{t("inlay.specs.level1Height")}</span>
                Z = {SYSTEM.inlayLevel1ShelfZMm} mm
              </div>
              <div>
                <span className="text-white/40 block">{t("inlay.specs.level2Height")}</span>
                Z = {SYSTEM.inlayLevel2ShelfZMm} mm
              </div>
            </div>
          </div>
        </div>

        {/* Right / Bottom: 2D Shelf Editor & Level Tabs */}
        <div className="lg:col-span-7 space-y-4">
          {/* Level Switcher Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-white/15 bg-black/50">
            <button
              type="button"
              onClick={() => handleLevelSwitch(1)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeLevel === 1
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{t("inlay.level1Tab")}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                  activeLevel === 1 ? "bg-black/20 text-black" : "bg-white/10 text-white/80"
                }`}
              >
                {level1Cutouts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleLevelSwitch(2)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeLevel === 2
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{t("inlay.level2Tab")}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                  activeLevel === 2 ? "bg-black/20 text-black" : "bg-white/10 text-white/80"
                }`}
              >
                {level2Cutouts.length}
              </span>
            </button>
          </div>

          {/* Active Level Shelf Editor */}
          <div className="rounded-3xl border border-white/15 bg-black/45 backdrop-blur-md p-5 shadow-2xl">
            {activeLevel === 1 ? (
              <InlayShelfEditor
                key="shelf-level-1"
                level={1}
                cutouts={level1Cutouts}
                onChange={setLevel1Cutouts}
                activeIndex={activeCutoutIndex}
                onActiveIndexChange={setActiveCutoutIndex}
              />
            ) : (
              <InlayShelfEditor
                key="shelf-level-2"
                level={2}
                cutouts={level2Cutouts}
                onChange={setLevel2Cutouts}
                activeIndex={activeCutoutIndex}
                onActiveIndexChange={setActiveCutoutIndex}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
