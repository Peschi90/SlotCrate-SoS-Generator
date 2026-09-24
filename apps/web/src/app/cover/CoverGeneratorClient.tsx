"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Cover3DPreview } from "@/components/Cover3DPreview";
import { CoverFrontEditor } from "@/components/CoverFrontEditor";
import { SYSTEM } from "@/lib/system";
import type { GeneratorSettingsPayload } from "@/lib/generator-settings-schema";

type SuitcaseVariant = GeneratorSettingsPayload["suitcaseVariants"][number];
type CoverFontName = typeof SYSTEM.coverFonts[number]["value"];

interface Props {
  suitcaseVariants?: SuitcaseVariant[];
  supportedVariantId: string;
}

export function CoverGeneratorClient({ suitcaseVariants, supportedVariantId }: Props) {
  const t = useTranslations("cover");
  const supportedVariant = suitcaseVariants?.find((variant) => variant.id === supportedVariantId);
  const [text, setText] = useState("SlotCrate");
  const [fontName, setFontName] = useState<CoverFontName>(SYSTEM.coverFonts[0].value);
  const [fontSizeMm, setFontSizeMm] = useState(18);
  const [centerXMm, setCenterXMm] = useState(SYSTEM.coverWidthMm / 2);
  const [centerYMm, setCenterYMm] = useState(SYSTEM.coverDepthMm / 2);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTransform = (change: { centerXMm?: number; centerYMm?: number; rotationDeg?: number }) => {
    if (change.centerXMm !== undefined) {
      setCenterXMm(Math.max(SYSTEM.coverEdgeMarginMm, Math.min(SYSTEM.coverWidthMm - SYSTEM.coverEdgeMarginMm, change.centerXMm)));
    }
    if (change.centerYMm !== undefined) {
      setCenterYMm(Math.max(SYSTEM.coverEdgeMarginMm, Math.min(SYSTEM.coverDepthMm - SYSTEM.coverEdgeMarginMm, change.centerYMm)));
    }
    if (change.rotationDeg !== undefined) {
      setRotationDeg(Math.max(-180, Math.min(180, change.rotationDeg)));
    }
  };

  const download = async () => {
    setError(null);
    setDownloading(true);
    try {
      const response = await fetch("/api/cover/stl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverVariantId: supportedVariantId, text, fontName, fontSizeMm, centerXMm, centerYMm, rotationDeg })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "SlotCrate_SM_Cover.stl";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError((cause as Error).message || t("downloadError"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#f0b35b] font-mono font-semibold">{t("badge")}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">{t("title")}</h1>
          <p className="text-sm text-white/70 max-w-2xl mt-1">{t("description")}</p>
        </div>
        <button type="button" onClick={download} disabled={downloading || !text} className="slotcrate-button-primary flex items-center gap-2 text-sm py-2.5 px-6 shadow-lg hover:shadow-[#5fbb2e]/25">
          {downloading ? (
            <>
              <span className="inline-block animate-spin" aria-hidden="true">⏳</span>
              <span>{t("generating")}</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">⬇</span>
              <span>{t("download")}</span>
            </>
          )}
        </button>
      </header>

      {error && <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-4 items-start">
          <div className="rounded-3xl border border-white/15 bg-black/40 backdrop-blur-md overflow-hidden h-[480px] lg:h-[620px] relative shadow-2xl">
            <Cover3DPreview
              text={text}
              fontName={fontName}
              fontSizeMm={fontSizeMm}
              centerXMm={centerXMm}
              centerYMm={centerYMm}
              rotationDeg={rotationDeg}
              onTransformChange={updateTransform}
            />
            <div className="absolute bottom-3 right-3 rounded-lg bg-black/65 px-3 py-2 text-[11px] text-white/70">{t("dragHint")}</div>
          </div>
          <div className="lg:sticky lg:top-28">
            <CoverFrontEditor
              text={text}
              fontName={fontName}
              fontSizeMm={fontSizeMm}
              centerXMm={centerXMm}
              centerYMm={centerYMm}
              rotationDeg={rotationDeg}
              onTransformChange={updateTransform}
            />
          </div>
        </div>

        <section className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/30 p-5 space-y-5">
          <div>
            <label htmlFor="cover-variant" className="block text-sm font-semibold text-white mb-2">{t("variant")}</label>
            <select id="cover-variant" value={supportedVariantId} disabled className="slotcrate-select w-full text-sm py-2.5 px-3 rounded-xl border border-white/20 bg-black/60 text-white disabled:opacity-80">
              <option value={supportedVariantId}>{supportedVariant?.label ?? t("variantDefault")}</option>
            </select>
            <p className="mt-1 text-xs text-white/50">{t("variantHint")}</p>
          </div>

          <div>
            <label htmlFor="cover-text" className="block text-sm font-semibold text-white mb-2">{t("textLabel")}</label>
            <input
              id="cover-text"
              value={text}
              maxLength={SYSTEM.coverMaxTextLength}
              onChange={(event) => setText(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-black/50 px-3 py-2.5 text-white outline-none focus:border-[#f0b35b]"
            />
            <p className="mt-1 text-xs text-white/50">{t("textHint", { count: SYSTEM.coverMaxTextLength })}</p>
          </div>

          <div>
            <label htmlFor="cover-font" className="block text-sm font-semibold text-white mb-2">{t("fontFamily")}</label>
            <select
              id="cover-font"
              value={fontName}
              onChange={(event) => setFontName(event.target.value as CoverFontName)}
              className="slotcrate-select w-full text-sm py-2.5 px-3 rounded-xl border border-white/20 bg-black/60 text-white"
            >
              {SYSTEM.coverFonts.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
            </select>
          </div>

          <RangeField label={t("fontSize")} value={fontSizeMm} min={SYSTEM.coverMinFontSizeMm} max={SYSTEM.coverMaxFontSizeMm} step={0.5} unit="mm" onChange={setFontSizeMm} />
          <RangeField label={t("positionX")} value={centerXMm} min={SYSTEM.coverEdgeMarginMm} max={SYSTEM.coverWidthMm - SYSTEM.coverEdgeMarginMm} step={0.5} unit="mm" onChange={setCenterXMm} />
          <RangeField label={t("positionY")} value={centerYMm} min={SYSTEM.coverEdgeMarginMm} max={SYSTEM.coverDepthMm - SYSTEM.coverEdgeMarginMm} step={0.5} unit="mm" onChange={setCenterYMm} />
          <RangeField label={t("rotation")} value={rotationDeg} min={-180} max={180} step={1} unit="°" onChange={setRotationDeg} />

          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs font-mono text-white/65">
            <div><span className="block text-white/40">{t("coverSize")}</span>{SYSTEM.coverWidthMm} × {SYSTEM.coverDepthMm} × {SYSTEM.coverHeightMm} mm</div>
            <div><span className="block text-white/40">{t("groove")}</span>{SYSTEM.coverGrooveDepthMm} mm / {SYSTEM.coverGrooveWidthMm} mm</div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RangeField({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange(value: number): void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm text-white/85 mb-2"><span>{label}</span><span className="font-mono text-white/55">{value.toFixed(step < 1 ? 1 : 0)} {unit}</span></span>
          <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="slotcrate-range" />
    </label>
  );
}
