"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BoxPreview } from "@/components/BoxPreview";
import type { GeneratorSettingsPayload } from "@/lib/generator-settings-schema";
import { SYSTEM } from "@/lib/system";
import styles from "./generator-test.module.css";

type SuitcaseVariant = GeneratorSettingsPayload["suitcaseVariants"][number];

const HEIGHTS = [15.8, 35.8, 55.8, 75.8] as const;

export function GeneratorTestClient({
  defaultHeightMm,
  minHeightMm,
  maxHeightMm,
  suitcaseVariants,
  filenamePrefix
}: {
  defaultHeightMm: number;
  minHeightMm: number;
  maxHeightMm: number;
  suitcaseVariants?: SuitcaseVariant[];
  filenamePrefix: string;
}) {
  const t = useTranslations("generatorTest");
  const variants = suitcaseVariants?.length ? suitcaseVariants : [fallbackVariant(defaultHeightMm)];
  const [variantId, setVariantId] = useState(variants[0]!.id);
  const activeVariant = variants.find((variant) => variant.id === variantId) ?? variants[0]!;
  const [widthCells, setWidthCells] = useState(activeVariant.minCells);
  const [depthCells, setDepthCells] = useState(activeVariant.minCells);
  const [heightMm, setHeightMm] = useState(closestHeight(activeVariant.boxHeightMm));
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = pending || controller !== null;
  const widthMm = widthCells * activeVariant.gridPitchMm;
  const depthMm = depthCells * activeVariant.gridPitchMm;

  async function download() {
    setError(null);
    const abortController = new AbortController();
    setController(abortController);
    try {
      const response = await fetch("/api/box/stl", {
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
          stlTessellationAngularRad: activeVariant.stlTessellationAngularRad,
          dividers: [],
          pockets: [],
          pocketsFillOuter: false,
          waveInserts: []
        }),
        signal: abortController.signal
      });
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${filenamePrefix}_${activeVariant.id}_${widthCells}x${depthCells}_H${heightMm}.stl`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError: unknown) {
      if ((downloadError as Error).name !== "AbortError") setError(t("exportError"));
    } finally {
      setController(null);
    }
  }

  function updateVariant(nextId: string) {
    const next = variants.find((variant) => variant.id === nextId);
    if (!next) return;
    setVariantId(nextId);
    setWidthCells((value) => Math.min(next.maxWidthCells, Math.max(next.minCells, value)));
    setDepthCells((value) => Math.min(next.maxDepthCells, Math.max(next.minCells, value)));
    setHeightMm(Math.min(maxHeightMm, Math.max(minHeightMm, closestHeight(next.boxHeightMm))));
  }

  return (
    <div className={styles.studio}>
      <header className={styles.studioHeader}>
        <Link href="/" className={styles.wordmark}>
          <span>SlotCrate</span><strong>Studio</strong>
        </Link>
        <span className={styles.cube} aria-hidden="true" />
        <p>{t("tagline")}</p>
        <span className={styles.testBadge}>{t("testBadge")}</span>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.rail} aria-label={t("sectionNavigation")}>
          <div className={styles.railActive}><span className={styles.cube} />{t("singleBox")}</div>
          <div className={styles.railItem}><span>01</span>{t("dimensions")}</div>
          <div className={styles.railItem}><span>02</span>{t("preview")}</div>
          <div className={styles.railItem}><span>03</span>{t("export")}</div>
          <div className={styles.railSlogan}>{t("tagline")}</div>
        </aside>

        <main className={styles.previewPanel}>
          <div className={styles.panelHeading}>
            <div><h1>{t("preview")}</h1><p>{t("previewHint")}</p></div>
            <div className={styles.status}><i />{t("live")}</div>
          </div>
          <div className={styles.canvas}>
            <BoxPreview
              widthCells={widthCells}
              depthCells={depthCells}
              heightMm={heightMm}
              gridPitchMm={activeVariant.gridPitchMm}
              wallThicknessMm={activeVariant.wallThicknessMm}
              innerFloorRadiusMm={activeVariant.innerFloorRadiusMm}
              outerClearanceMm={activeVariant.outerClearanceMm}
            />
            <dl className={styles.measurements}>
              <div><dt>{t("width")}</dt><dd>{widthMm.toFixed(1)} mm</dd></div>
              <div><dt>{t("depth")}</dt><dd>{depthMm.toFixed(1)} mm</dd></div>
              <div><dt>{t("height")}</dt><dd>{heightMm.toFixed(1)} mm</dd></div>
            </dl>
          </div>
          <div className={styles.summary}>
            <div><span>{t("gridSize")}</span><strong>{widthCells} x {depthCells}</strong></div>
            <div><span>{t("outerSize")}</span><strong>{widthMm.toFixed(1)} x {depthMm.toFixed(1)} mm</strong></div>
            <div><span>{t("gridPitch")}</span><strong>{activeVariant.gridPitchMm.toFixed(2)} mm</strong></div>
          </div>
        </main>

        <form className={styles.config} onSubmit={(event) => { event.preventDefault(); startTransition(download); }}>
          <div className={styles.tabs}><strong>{t("configuration")}</strong><span>{t("appearance")}</span><span>{t("export")}</span></div>
          <ConfigSection title={t("system")}>
            <label>{t("variant")}
              <select value={variantId} onChange={(event) => updateVariant(event.target.value)}>
                {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
              </select>
            </label>
          </ConfigSection>
          <ConfigSection title={t("dimensions")}>
            <Stepper label={t("widthCells")} value={widthCells} min={activeVariant.minCells} max={activeVariant.maxWidthCells} onChange={setWidthCells} />
            <Stepper label={t("depthCells")} value={depthCells} min={activeVariant.minCells} max={activeVariant.maxDepthCells} onChange={setDepthCells} />
          </ConfigSection>
          <ConfigSection title={t("height")}>
            <div className={styles.heightGrid}>
              {HEIGHTS.map((height, index) => (
                <button type="button" key={height} className={heightMm === height ? styles.selected : ""} onClick={() => setHeightMm(height)}>
                  <strong>{(index + 1) * 20} mm</strong><span>{height.toFixed(1)} mm</span>
                </button>
              ))}
            </div>
          </ConfigSection>
          <section className={styles.exportBlock}>
            <p>{t("exportHint")}</p>
            <button className={styles.exportButton} type="submit" disabled={busy}>{busy ? t("exporting") : t("exportStl")}</button>
            {busy && <button className={styles.cancelButton} type="button" onClick={() => controller?.abort()}>{t("cancel")}</button>}
            {error && <div className={styles.error} role="alert">{error}</div>}
          </section>
        </form>
      </div>
    </div>
  );
}

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={styles.configSection}><h2>{title}</h2>{children}</section>;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange(value: number): void }) {
  return (
    <div className={styles.stepper}>
      <span>{label}</span>
      <div><button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>-</button><strong>{value}</strong><button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button></div>
    </div>
  );
}

function closestHeight(height: number): number {
  return HEIGHTS.reduce((closest, candidate) => Math.abs(candidate - height) < Math.abs(closest - height) ? candidate : closest);
}

function fallbackVariant(defaultHeightMm: number): SuitcaseVariant {
  return {
    id: "sc-124-v2", label: "SC 124 V2", minCells: SYSTEM.minCells,
    maxWidthCells: SYSTEM.maxCells, maxDepthCells: SYSTEM.maxCells,
    gridPitchMm: SYSTEM.gridPitchMm, boxHeightMm: defaultHeightMm,
    wallThicknessMm: SYSTEM.wallThicknessMm, innerFloorRadiusMm: 2.5,
    outerClearanceMm: 0, stlTessellationLinearMm: 0.05,
    stlTessellationAngularRad: 0.5, plateStepFile: "SlotCrate.step"
  };
}