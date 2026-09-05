"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useLayoutStore } from "@/lib/layout-store";
import { createDraft, parseLayoutDraftBestEffort, type LayoutDraft, type LayoutDraftWarning } from "@/lib/layout-draft";
import {
  clearAutoSavedDraft,
  deleteDraft,
  draftToJsonBlob,
  listDrafts,
  loadAutoSavedDraft,
  loadDraft,
  readDraftFromFile,
  saveAutoSavedDraft,
  saveNamedDraft,
  type StoredDraftMeta
} from "@/lib/layout-persistence";

interface Props {
  variantIds: string[];
  activeVariantId: string;
  onVariantChange(id: string): void;
  onWarnings?(warnings: LayoutDraftWarning[]): void;
}

interface ShareInfo {
  id: string;
  url: string;
  expiresAt: string;
}

const AUTO_SAVE_DEBOUNCE_MS = 500;

export function PlannerPersistencePanel({ variantIds, activeVariantId, onVariantChange, onWarnings }: Props) {
  const t = useTranslations("planner.persistence");
  const formatter = useFormatter();

  const boxes = useLayoutStore((s) => s.boxes);
  const selectedHeightMm = useLayoutStore((s) => s.selectedHeightMm);
  const loadBoxes = useLayoutStore((s) => s.loadBoxes);

  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [warnings, setWarnings] = useState<LayoutDraftWarning[]>([]);
  const [drafts, setDrafts] = useState<StoredDraftMeta[]>([]);
  const [draftName, setDraftName] = useState("");
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [sharing, setSharing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Hydration: Share-Param → Auto-Save --------------------------------
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get("share");
      if (shareId && /^[A-Za-z0-9_-]{6,16}$/.test(shareId)) {
        try {
          const res = await fetch(`/api/layout/share/${shareId}`);
          if (res.ok) {
            const body = (await res.json()) as { draft: unknown };
            const parsed = parseLayoutDraftBestEffort(body.draft);
            if (!cancelled && parsed.draft) {
              applyDraft(parsed.draft, parsed.warnings, { source: "share" });
              setHydrated(true);
              // Share-Param nach dem Laden aus der URL entfernen.
              const url = new URL(window.location.href);
              url.searchParams.delete("share");
              window.history.replaceState({}, "", url.toString());
              return;
            }
          } else {
            const code = (await res.json().catch(() => ({}))).error ?? String(res.status);
            setMessage({ tone: "error", text: t("shareLoadFailed", { code: String(code) }) });
          }
        } catch {
          setMessage({ tone: "error", text: t("shareLoadFailed", { code: "NETWORK" }) });
        }
      }
      const auto = loadAutoSavedDraft();
      if (!cancelled && auto?.draft) {
        applyDraft(auto.draft, auto.warnings, { source: "auto", silent: true });
      }
      if (!cancelled) setHydrated(true);
    }
    void hydrate();
    setDrafts(listDrafts());
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Auto-Save on change (debounced) -----------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const handle = window.setTimeout(() => {
      if (boxes.length === 0) {
        clearAutoSavedDraft();
        setAutoSavedAt(null);
        return;
      }
      const draft = createDraft({
        variantId: activeVariantId,
        selectedHeightMm,
        boxes
      });
      saveAutoSavedDraft(draft);
      setAutoSavedAt(new Date());
    }, AUTO_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [hydrated, boxes, selectedHeightMm, activeVariantId]);

  function applyDraft(
    draft: LayoutDraft,
    incomingWarnings: LayoutDraftWarning[],
    opts: { source: "share" | "auto" | "file" | "draft"; silent?: boolean } = { source: "file" }
  ) {
    const combined: LayoutDraftWarning[] = [...incomingWarnings];
    if (variantIds.length > 0 && !variantIds.includes(draft.variantId)) {
      combined.push("DRAFT_VARIANT_UNKNOWN");
    } else if (draft.variantId !== activeVariantId) {
      onVariantChange(draft.variantId);
    }
    const result = loadBoxes(draft.boxes, draft.selectedHeightMm);
    // Variantwechsel triggert einen Height-Reset im Elternteil im nächsten
    // Render; wir setzen die gewünschte Höhe daher nach dem Flush erneut.
    queueMicrotask(() => {
      useLayoutStore.getState().setHeightMm(draft.selectedHeightMm);
    });
    if (result.skipped > 0 && !combined.includes("DRAFT_BOX_OVERLAP")) {
      combined.push("DRAFT_BOX_OVERLAP");
    }
    setWarnings(combined);
    onWarnings?.(combined);
    if (!opts.silent) {
      const text =
        opts.source === "share"
          ? t("loadedFromShare")
          : t("loadSummary", { placed: result.placed, skipped: result.skipped });
      setMessage({ tone: "info", text });
    }
  }

  function handleExport() {
    const draft = createDraft({ variantId: activeVariantId, selectedHeightMm, boxes });
    const blob = draftToJsonBlob(draft);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slotcrate_layout_${activeVariantId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    const result = await readDraftFromFile(file);
    if (!result.draft) {
      setMessage({ tone: "error", text: t("importInvalid") });
      setWarnings(result.warnings);
      onWarnings?.(result.warnings);
      return;
    }
    applyDraft(result.draft, result.warnings, { source: "file" });
  }

  function handleSaveDraft() {
    const name = draftName.trim() || new Date().toLocaleString();
    const draft = createDraft({ variantId: activeVariantId, selectedHeightMm, boxes });
    const meta = saveNamedDraft(name, draft);
    setDrafts(listDrafts());
    setDraftName("");
    setMessage({ tone: "info", text: t("draftSaved", { name: meta.name }) });
  }

  function handleLoadDraft(id: string) {
    const result = loadDraft(id);
    if (!result?.draft) return;
    applyDraft(result.draft, result.warnings, { source: "draft" });
  }

  function handleDeleteDraft(id: string) {
    if (!window.confirm(t("draftDeleteConfirm"))) return;
    deleteDraft(id);
    setDrafts(listDrafts());
  }

  async function handleShare() {
    setSharing(true);
    setMessage(null);
    try {
      const draft = createDraft({ variantId: activeVariantId, selectedHeightMm, boxes });
      const res = await fetch("/api/layout/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      if (!res.ok) {
        const code = (await res.json().catch(() => ({}))).error ?? String(res.status);
        setMessage({ tone: "error", text: t("shareFailed", { code: String(code) }) });
        return;
      }
      const body = (await res.json()) as { id: string; expiresAt: string };
      const url = `${window.location.origin}/planner?share=${body.id}`;
      setShare({ id: body.id, url, expiresAt: body.expiresAt });
      try {
        await navigator.clipboard.writeText(url);
        setMessage({ tone: "info", text: t("shareCopied") });
      } catch {
        // ohne Clipboard-Erlaubnis reicht die Anzeige der URL
      }
    } catch {
      setMessage({ tone: "error", text: t("shareFailed", { code: "NETWORK" }) });
    } finally {
      setSharing(false);
    }
  }

  async function copyShareUrl() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setMessage({ tone: "info", text: t("shareCopied") });
    } catch {
      // ignore
    }
  }

  return (
    <section className="space-y-3 border-t border-neutral-800 pt-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-100">{t("title")}</h2>
        <span className="text-[11px] text-neutral-500">
          {autoSavedAt
            ? t("autoSaved", { time: formatter.dateTime(autoSavedAt, { timeStyle: "short" }) })
            : t("autoSavedNever")}
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleExport}
          disabled={boxes.length === 0}
          className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
        >
          {t("exportJson")}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500"
        >
          {t("importJson")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleImport(file);
          }}
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-neutral-200">{t("draftsTitle")}</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={t("draftNamePlaceholder")}
            maxLength={60}
            className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:border-crate-box focus:outline-none"
          />
          <button
            onClick={handleSaveDraft}
            disabled={boxes.length === 0}
            className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            {t("draftSave")}
          </button>
        </div>
        {drafts.length === 0 ? (
          <div className="text-[11px] text-neutral-500">{t("draftEmpty")}</div>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-auto">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-xs bg-neutral-900/60 rounded-xl border border-neutral-800 px-3 py-1.5">
                <span className="flex-1 truncate" title={d.name}>{d.name}</span>
                <button
                  onClick={() => handleLoadDraft(d.id)}
                  className="text-neutral-300 transition hover:text-white"
                >
                  {t("draftLoad")}
                </button>
                <button
                  onClick={() => handleDeleteDraft(d.id)}
                  className="text-red-400 transition hover:text-red-300"
                >
                  {t("draftDelete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-neutral-200">{t("shareTitle")}</div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleShare}
            disabled={boxes.length === 0 || sharing}
            className="rounded-xl bg-crate-box px-3 py-2 text-xs font-medium text-neutral-950 shadow-[0_0_14px_rgba(76,140,255,0.35)] transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
          >
            {sharing ? t("shareCreating") : t("shareCreate")}
          </button>
          {share && (
            <button
              onClick={copyShareUrl}
              className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500"
            >
              {t("shareCopy")}
            </button>
          )}
        </div>
        {share && (
          <div className="space-y-1">
            <input
              readOnly
              value={share.url}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-[11px] text-neutral-200 focus:border-crate-box focus:outline-none"
            />
            <div className="text-[11px] text-neutral-500">
              {t("shareExpires", { date: formatter.dateTime(new Date(share.expiresAt), { dateStyle: "medium" }) })}
            </div>
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <ul className="rounded-xl border border-amber-800/60 bg-amber-900/20 p-2 text-[11px] text-amber-200 space-y-1">
          {warnings.map((code) => (
            <li key={code}>{t(`warnings.${code}`)}</li>
          ))}
        </ul>
      )}

      {message && (
        <div
          className={
            message.tone === "error"
              ? "text-[11px] text-red-400"
              : "text-[11px] text-neutral-300"
          }
        >
          {message.text}
        </div>
      )}
    </section>
  );
}
