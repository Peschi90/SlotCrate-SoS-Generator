"use client";

import { parseLayoutDraftBestEffort, type LayoutDraft, type ParseLayoutDraftResult } from "./layout-draft";

const CURRENT_KEY = "slotcrate.planner.current.v1";
const DRAFTS_KEY = "slotcrate.planner.drafts.v1";

export interface StoredDraftMeta {
  id: string;
  name: string;
  updatedAt: string;
}

export interface StoredDraft extends StoredDraftMeta {
  draft: LayoutDraft;
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(key, JSON.stringify(value));
  } catch {
    // Quota überschritten oder Storage nicht verfügbar → still schlucken.
  }
}

function removeKey(key: string): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(key);
  } catch {
    // ignore
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// --- Auto-Save ---------------------------------------------------------------

export function loadAutoSavedDraft(): ParseLayoutDraftResult | null {
  const raw = readJson<unknown>(CURRENT_KEY);
  if (raw === null) return null;
  return parseLayoutDraftBestEffort(raw);
}

export function saveAutoSavedDraft(draft: LayoutDraft): void {
  writeJson(CURRENT_KEY, draft);
}

export function clearAutoSavedDraft(): void {
  removeKey(CURRENT_KEY);
}

// --- Benannte Entwürfe -------------------------------------------------------

export function listDrafts(): StoredDraftMeta[] {
  const list = readJson<StoredDraft[]>(DRAFTS_KEY);
  if (!Array.isArray(list)) return [];
  return list
    .filter((d) => d && typeof d.id === "string" && typeof d.name === "string")
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function loadDraft(id: string): ParseLayoutDraftResult | null {
  const list = readJson<StoredDraft[]>(DRAFTS_KEY);
  if (!Array.isArray(list)) return null;
  const found = list.find((d) => d && d.id === id);
  if (!found) return null;
  return parseLayoutDraftBestEffort(found.draft);
}

export function saveNamedDraft(name: string, draft: LayoutDraft): StoredDraftMeta {
  const clean = name.trim().slice(0, 60) || "Layout";
  const list = readJson<StoredDraft[]>(DRAFTS_KEY);
  const arr = Array.isArray(list) ? list : [];
  const entry: StoredDraft = {
    id: newId(),
    name: clean,
    updatedAt: new Date().toISOString(),
    draft
  };
  arr.push(entry);
  // Obergrenze zur Sicherheit: 50 Entwürfe pro Browser.
  const trimmed = arr.slice(-50);
  writeJson(DRAFTS_KEY, trimmed);
  return { id: entry.id, name: entry.name, updatedAt: entry.updatedAt };
}

export function updateDraft(id: string, patch: { name?: string; draft?: LayoutDraft }): StoredDraftMeta | null {
  const list = readJson<StoredDraft[]>(DRAFTS_KEY);
  if (!Array.isArray(list)) return null;
  const idx = list.findIndex((d) => d && d.id === id);
  if (idx < 0) return null;
  const current = list[idx]!;
  const next: StoredDraft = {
    ...current,
    name: patch.name !== undefined ? patch.name.trim().slice(0, 60) || current.name : current.name,
    draft: patch.draft ?? current.draft,
    updatedAt: new Date().toISOString()
  };
  list[idx] = next;
  writeJson(DRAFTS_KEY, list);
  return { id: next.id, name: next.name, updatedAt: next.updatedAt };
}

export function deleteDraft(id: string): void {
  const list = readJson<StoredDraft[]>(DRAFTS_KEY);
  if (!Array.isArray(list)) return;
  writeJson(
    DRAFTS_KEY,
    list.filter((d) => d && d.id !== id)
  );
}

// --- JSON Import / Export ----------------------------------------------------

export function draftToJsonBlob(draft: LayoutDraft): Blob {
  return new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
}

export async function readDraftFromFile(file: File): Promise<ParseLayoutDraftResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { draft: null, warnings: [] };
  }
  return parseLayoutDraftBestEffort(parsed);
}
