"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { GeneratorSettingsPayload } from "@/lib/generator-settings-schema";

export function AdminSettingsForm({
  current
}: {
  current: GeneratorSettingsPayload;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState<GeneratorSettingsPayload>(current);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    void loadCsrfToken();
  }, []);

  async function loadCsrfToken(): Promise<string> {
    const res = await fetch("/api/auth/csrf", { method: "GET" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { csrfToken?: string };
    if (!data.csrfToken) throw new Error("missing csrf token");
    setCsrfToken(data.csrfToken);
    return data.csrfToken;
  }

  function upd<K extends keyof GeneratorSettingsPayload>(key: K, value: GeneratorSettingsPayload[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function updVariant(index: number, patch: Partial<GeneratorSettingsPayload["suitcaseVariants"][number]>) {
    setDraft((d) => {
      const next = [...d.suitcaseVariants];
      const current = next[index];
      if (!current) return d;
      next[index] = { ...current, ...patch };
      return { ...d, suitcaseVariants: next };
    });
  }

  function addVariant() {
    setDraft((d) => {
      const nextIndex = d.suitcaseVariants.length + 1;
      return {
        ...d,
        suitcaseVariants: [
          ...d.suitcaseVariants,
          {
            id: `variant-${nextIndex}`,
            label: `Variant ${nextIndex}`,
            maxWidthCells: d.maxCells,
            maxDepthCells: d.maxCells,
            scaleFactor: 1,
            defaultHeightMm: d.boxHeightMm
          }
        ]
      };
    });
  }

  function removeVariant(index: number) {
    setDraft((d) => ({
      ...d,
      suitcaseVariants: d.suitcaseVariants.filter((_, i) => i !== index)
    }));
  }

  async function publish() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = csrfToken ?? (await loadCsrfToken());
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken: token, note, payload: draft })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `status ${res.status}`);
      setMessage(t("admin.published", { version: data.version }));
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-neutral-800 rounded-md p-4 space-y-4">
      <h2 className="font-semibold">{t("admin.settingsTitle")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumField label={t("admin.field.boxHeightMm")} value={draft.boxHeightMm} min={6} max={200} step={0.1} onChange={(v) => upd("boxHeightMm", v)} />
        <NumField label={t("admin.field.wallThicknessMm")} value={draft.wallThicknessMm} min={0.6} max={4} step={0.05} onChange={(v) => upd("wallThicknessMm", v)} />
        <NumField label={t("admin.field.innerFloorRadiusMm")} value={draft.innerFloorRadiusMm} min={0} max={4} step={0.1} onChange={(v) => upd("innerFloorRadiusMm", v)} />
        <NumField label={t("admin.field.outerClearanceMm")} value={draft.outerClearanceMm} min={0} max={0.5} step={0.01} onChange={(v) => upd("outerClearanceMm", v)} />
        <NumField label={t("admin.field.minCells")} value={draft.minCells} min={1} max={10} step={1} onChange={(v) => upd("minCells", v)} />
        <NumField label={t("admin.field.maxCells")} value={draft.maxCells} min={1} max={10} step={1} onChange={(v) => upd("maxCells", v)} />
        <NumField label={t("admin.field.stlTessellationLinearMm")} value={draft.stlTessellationLinearMm} min={0.005} max={0.5} step={0.005} onChange={(v) => upd("stlTessellationLinearMm", v)} />
        <NumField label={t("admin.field.stlTessellationAngularRad")} value={draft.stlTessellationAngularRad} min={0.05} max={1} step={0.05} onChange={(v) => upd("stlTessellationAngularRad", v)} />
        <TextField label={t("admin.field.filenamePrefix")} value={draft.filenamePrefix} onChange={(v) => upd("filenamePrefix", v)} />
      </div>

      <div className="space-y-3 border-t border-neutral-800 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">{t("admin.variantsTitle")}</h3>
          <button
            type="button"
            onClick={addVariant}
            className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700"
          >
            {t("admin.variantAdd")}
          </button>
        </div>
        <div className="space-y-3">
          {draft.suitcaseVariants.map((variant, index) => (
            <div key={`${variant.id}-${index}`} className="rounded border border-neutral-700 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{variant.label}</p>
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  disabled={draft.suitcaseVariants.length <= 1}
                  className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 disabled:opacity-50"
                >
                  {t("admin.variantRemove")}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField
                  label={t("admin.variantId")}
                  value={variant.id}
                  onChange={(v) => updVariant(index, { id: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                />
                <TextField
                  label={t("admin.variantLabel")}
                  value={variant.label}
                  onChange={(v) => updVariant(index, { label: v })}
                />
                <NumField
                  label={t("admin.variantMaxWidth")}
                  value={variant.maxWidthCells}
                  min={draft.minCells}
                  max={draft.maxCells}
                  step={1}
                  onChange={(v) => updVariant(index, { maxWidthCells: Math.round(v) })}
                />
                <NumField
                  label={t("admin.variantMaxDepth")}
                  value={variant.maxDepthCells}
                  min={draft.minCells}
                  max={draft.maxCells}
                  step={1}
                  onChange={(v) => updVariant(index, { maxDepthCells: Math.round(v) })}
                />
                <NumField
                  label={t("admin.variantScale")}
                  value={variant.scaleFactor}
                  min={0.7}
                  max={1.5}
                  step={0.01}
                  onChange={(v) => updVariant(index, { scaleFactor: v })}
                />
                <NumField
                  label={t("admin.variantDefaultHeight")}
                  value={variant.defaultHeightMm}
                  min={6}
                  max={200}
                  step={0.1}
                  onChange={(v) => updVariant(index, { defaultHeightMm: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="note">{t("admin.note")}</label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={255}
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
        />
      </div>
      {error && <div className="text-sm text-red-400" role="alert">{error}</div>}
      {message && <div className="text-sm text-emerald-400" role="status">{message}</div>}
      <button
        onClick={publish}
        disabled={busy}
        className="px-4 py-2 rounded bg-crate-box hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "…" : t("admin.publish")}
      </button>
    </section>
  );
}

function NumField({
  label, value, min, max, step, onChange
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange(v: number): void;
}) {
  return (
    <label className="text-sm">
      <span className="block mb-1">{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
    </label>
  );
}

function TextField({
  label, value, onChange
}: { label: string; value: string; onChange(v: string): void }) {
  return (
    <label className="text-sm">
      <span className="block mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
    </label>
  );
}
