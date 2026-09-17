"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BoxPreview } from "@/components/BoxPreview";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { DividerEditor } from "@/components/DividerEditor";
import { PocketEditor } from "@/components/PocketEditor";
import { WaveInsertEditor } from "@/components/WaveInsertEditor";
import type { GeneratorSettingsPayload } from "@/lib/generator-settings-schema";
import { clampDividers, clampPockets, clampWaveInserts } from "@/lib/layout-store";
import type { Divider, Pocket, WaveInsert } from "@/lib/schema";
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
  const [dividers, setDividers] = useState<Divider[]>([]);
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [pocketsFillOuter, setPocketsFillOuter] = useState(false);
  const [waveInserts, setWaveInserts] = useState<WaveInsert[]>([]);
  const [activeDividerIndex, setActiveDividerIndex] = useState<number | null>(null);
  const [activePocketIndex, setActivePocketIndex] = useState<number | null>(null);
  const [activeWaveInsertIndex, setActiveWaveInsertIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = pending || controller !== null;
  const widthMm = widthCells * activeVariant.gridPitchMm;
  const depthMm = depthCells * activeVariant.gridPitchMm;
  const sanitizedDividers = useMemo(
    () => clampDividers(dividers, widthCells, depthCells, heightMm, activeVariant.gridPitchMm, activeVariant.wallThicknessMm),
    [dividers, widthCells, depthCells, heightMm, activeVariant.gridPitchMm, activeVariant.wallThicknessMm]
  );
  const sanitizedPockets = useMemo(
    () => clampPockets(pockets, widthCells, depthCells, heightMm, activeVariant.gridPitchMm, activeVariant.wallThicknessMm),
    [pockets, widthCells, depthCells, heightMm, activeVariant.gridPitchMm, activeVariant.wallThicknessMm]
  );
  const sanitizedWaveInserts = useMemo(
    () => clampWaveInserts(waveInserts, widthCells, depthCells, heightMm, activeVariant.gridPitchMm, activeVariant.wallThicknessMm),
    [waveInserts, widthCells, depthCells, heightMm, activeVariant.gridPitchMm, activeVariant.wallThicknessMm]
  );

  useEffect(() => { if (sanitizedDividers.length !== dividers.length) setDividers(sanitizedDividers); }, [sanitizedDividers, dividers.length]);
  useEffect(() => { if (sanitizedPockets.length !== pockets.length) setPockets(sanitizedPockets); }, [sanitizedPockets, pockets.length]);
  useEffect(() => { if (sanitizedWaveInserts.length !== waveInserts.length) setWaveInserts(sanitizedWaveInserts); }, [sanitizedWaveInserts, waveInserts.length]);
  useEffect(() => { setActiveDividerIndex((index) => index !== null && index >= sanitizedDividers.length ? null : index); }, [sanitizedDividers.length]);
  useEffect(() => { setActivePocketIndex((index) => index !== null && index >= sanitizedPockets.length ? null : index); }, [sanitizedPockets.length]);
  useEffect(() => { setActiveWaveInsertIndex((index) => index !== null && index >= sanitizedWaveInserts.length ? null : index); }, [sanitizedWaveInserts.length]);

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
          dividers: sanitizedDividers,
          pockets: sanitizedPockets,
          pocketsFillOuter,
          waveInserts: sanitizedWaveInserts
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

  function resetConfiguration() {
    setWidthCells(activeVariant.minCells);
    setDepthCells(activeVariant.minCells);
    setHeightMm(Math.min(maxHeightMm, Math.max(minHeightMm, closestHeight(activeVariant.boxHeightMm))));
    setDividers([]);
    setPockets([]);
    setPocketsFillOuter(false);
    setWaveInserts([]);
    setActiveDividerIndex(null);
    setActivePocketIndex(null);
    setActiveWaveInsertIndex(null);
    setError(null);
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
              color="#d9a928"
              canvasBackgroundColor="#171411"
              canvasAmbientLightColor="#fff1c2"
              canvasGroundLightColor="#2d2114"
              canvasAxisColors={["#e85d3f", "#d9a928", "#f4f0df"]}
              gridPitchMm={activeVariant.gridPitchMm}
              wallThicknessMm={activeVariant.wallThicknessMm}
              innerFloorRadiusMm={activeVariant.innerFloorRadiusMm}
              outerClearanceMm={activeVariant.outerClearanceMm}
              dividers={sanitizedDividers}
              pockets={sanitizedPockets}
              pocketsFillOuter={pocketsFillOuter}
              waveInserts={sanitizedWaveInserts}
              activeDividerIndex={activeDividerIndex}
              activePocketIndex={activePocketIndex}
              activeWaveInsertIndex={activeWaveInsertIndex}
              onDividerActivate={setActiveDividerIndex}
              onPocketActivate={setActivePocketIndex}
              onWaveInsertActivate={setActiveWaveInsertIndex}
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
          <div className={styles.featureSections}>
            <CollapsibleSection className={styles.featureSection} title={t("features.dividers")} badge={sanitizedDividers.length || undefined} defaultOpen={sanitizedDividers.length > 0}>
              <DividerEditor widthCells={widthCells} depthCells={depthCells} heightMm={heightMm} gridPitchMm={activeVariant.gridPitchMm} wallThicknessMm={activeVariant.wallThicknessMm} dividers={sanitizedDividers} onChange={setDividers} activeIndex={activeDividerIndex} onActiveIndexChange={setActiveDividerIndex} />
            </CollapsibleSection>
            <CollapsibleSection className={styles.featureSection} title={t("features.pockets")} badge={sanitizedPockets.length || undefined} defaultOpen={sanitizedPockets.length > 0}>
              <PocketEditor widthCells={widthCells} depthCells={depthCells} heightMm={heightMm} gridPitchMm={activeVariant.gridPitchMm} wallThicknessMm={activeVariant.wallThicknessMm} pockets={sanitizedPockets} onChange={setPockets} fillOuter={pocketsFillOuter} onFillOuterChange={setPocketsFillOuter} activeIndex={activePocketIndex} onActiveIndexChange={setActivePocketIndex} />
            </CollapsibleSection>
            <CollapsibleSection className={styles.featureSection} title={t("features.waveInserts")} badge={sanitizedWaveInserts.length || undefined} defaultOpen={sanitizedWaveInserts.length > 0}>
              <WaveInsertEditor widthCells={widthCells} depthCells={depthCells} heightMm={heightMm} gridPitchMm={activeVariant.gridPitchMm} wallThicknessMm={activeVariant.wallThicknessMm} waveInserts={sanitizedWaveInserts} onChange={setWaveInserts} activeIndex={activeWaveInsertIndex} onActiveIndexChange={setActiveWaveInsertIndex} />
            </CollapsibleSection>
          </div>
          <section className={styles.exportBlock}>
            <p>{t("exportHint")}</p>
            <button className={styles.exportButton} type="submit" disabled={busy}>{busy ? t("exporting") : t("exportStl")}</button>
            {busy && <button className={styles.cancelButton} type="button" onClick={() => controller?.abort()}>{t("cancel")}</button>}
            <button className={styles.resetButton} type="button" onClick={resetConfiguration} disabled={busy}>{t("reset")}</button>
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