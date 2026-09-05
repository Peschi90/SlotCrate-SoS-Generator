import { create } from "zustand";
import { SYSTEM } from "./system";

export interface PlacedBox {
  id: string;
  x: number;
  y: number;
  widthCells: number;
  depthCells: number;
  heightMm: number;
}

interface HistoryEntry {
  boxes: PlacedBox[];
}

export interface FillPlanEntry {
  x: number;
  y: number;
  widthCells: number;
  depthCells: number;
}

interface LayoutState {
  boxes: PlacedBox[];
  selectedId: string | null;
  selectedIds: string[];
  past: HistoryEntry[];
  future: HistoryEntry[];
  selectedHeightMm: number;

  addBox(x: number, y: number, widthCells: number, depthCells: number, heightMm?: number): PlacedBox | null;
  removeBox(id: string): void;
  removeSelected(): number;
  moveBox(id: string, x: number, y: number): boolean;
  moveSelected(dx: number, dy: number): boolean;
  resizeBox(id: string, widthCells: number, depthCells: number): boolean;
  rotateBox(id: string): boolean;
  rotateSelected(): number;
  duplicateBox(id: string): PlacedBox | null;
  duplicateSelected(): number;
  setBoxHeight(id: string, mm: number): void;
  select(id: string | null): void;
  toggleSelect(id: string): void;
  selectMany(ids: string[]): void;
  clearSelection(): void;
  setHeightMm(mm: number): void;
  undo(): void;
  redo(): void;
  reset(): void;
  canPlace(x: number, y: number, widthCells: number, depthCells: number, ignoreId?: string): boolean;
  loadBoxes(
    incoming: Array<{ x: number; y: number; widthCells: number; depthCells: number; heightMm: number }>,
    selectedHeightMm?: number
  ): { placed: number; skipped: number };
  applyFillPlan(plan: FillPlanEntry[], heightMm?: number): number;
}

function markOccupancy(occ: Set<number>, x: number, y: number, w: number, d: number): void {
  for (let i = x; i < x + w; i++) {
    for (let j = y; j < y + d; j++) {
      occ.add(i * SYSTEM.gridColumns + j);
    }
  }
}

function occupiedMap(boxes: PlacedBox[], ignoreIds?: Iterable<string>): Set<number> {
  const ignore = ignoreIds ? new Set(ignoreIds) : null;
  const occ = new Set<number>();
  for (const b of boxes) {
    if (ignore?.has(b.id)) continue;
    markOccupancy(occ, b.x, b.y, b.widthCells, b.depthCells);
  }
  return occ;
}

function fits(
  x: number,
  y: number,
  w: number,
  d: number,
  occ: Set<number>
): boolean {
  if (x < 0 || y < 0) return false;
  if (w < 1 || d < 1) return false;
  if (x + w > SYSTEM.gridColumns) return false;
  if (y + d > SYSTEM.gridRows) return false;
  for (let i = x; i < x + w; i++) {
    for (let j = y; j < y + d; j++) {
      if (occ.has(i * SYSTEM.gridColumns + j)) return false;
    }
  }
  return true;
}

function snapshot(state: Pick<LayoutState, "boxes">): HistoryEntry {
  return { boxes: state.boxes.map((b) => ({ ...b })) };
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSelection(prev: string[], boxes: PlacedBox[]): string[] {
  const known = new Set(boxes.map((b) => b.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of prev) {
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function primaryId(selectedIds: string[]): string | null {
  return selectedIds.length > 0 ? selectedIds[selectedIds.length - 1]! : null;
}

/** Row-major Suche nach der ersten freien Position für ein w×d-Rechteck. */
function findFreeSlot(
  occ: Set<number>,
  w: number,
  d: number,
  near?: { x: number; y: number }
): { x: number; y: number } | null {
  if (near) {
    const preferred: Array<{ x: number; y: number }> = [
      { x: near.x + w, y: near.y },
      { x: near.x, y: near.y + d }
    ];
    for (const c of preferred) {
      if (fits(c.x, c.y, w, d, occ)) return c;
    }
  }
  for (let y = 0; y <= SYSTEM.gridRows - d; y++) {
    for (let x = 0; x <= SYSTEM.gridColumns - w; x++) {
      if (fits(x, y, w, d, occ)) return { x, y };
    }
  }
  return null;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  boxes: [],
  selectedId: null,
  selectedIds: [],
  past: [],
  future: [],
  selectedHeightMm: SYSTEM.defaultBoxHeightMm,

  canPlace(x, y, w, d, ignoreId) {
    return fits(x, y, w, d, occupiedMap(get().boxes, ignoreId ? [ignoreId] : undefined));
  },

  addBox(x, y, widthCells, depthCells, heightMm) {
    const s = get();
    if (!fits(x, y, widthCells, depthCells, occupiedMap(s.boxes))) return null;
    const box: PlacedBox = {
      id: makeId(),
      x,
      y,
      widthCells,
      depthCells,
      heightMm: heightMm ?? s.selectedHeightMm
    };
    set({
      boxes: [...s.boxes, box],
      past: [...s.past, snapshot(s)],
      future: [],
      selectedIds: [box.id],
      selectedId: box.id
    });
    return box;
  },

  removeBox(id) {
    const s = get();
    if (!s.boxes.some((b) => b.id === id)) return;
    const nextBoxes = s.boxes.filter((b) => b.id !== id);
    const nextSelected = normalizeSelection(
      s.selectedIds.filter((sid) => sid !== id),
      nextBoxes
    );
    set({
      boxes: nextBoxes,
      past: [...s.past, snapshot(s)],
      future: [],
      selectedIds: nextSelected,
      selectedId: primaryId(nextSelected)
    });
  },

  removeSelected() {
    const s = get();
    if (s.selectedIds.length === 0) return 0;
    const ids = new Set(s.selectedIds);
    const removed = s.boxes.filter((b) => ids.has(b.id)).length;
    if (removed === 0) return 0;
    set({
      boxes: s.boxes.filter((b) => !ids.has(b.id)),
      past: [...s.past, snapshot(s)],
      future: [],
      selectedIds: [],
      selectedId: null
    });
    return removed;
  },

  moveBox(id, x, y) {
    const s = get();
    const box = s.boxes.find((b) => b.id === id);
    if (!box) return false;
    if (!fits(x, y, box.widthCells, box.depthCells, occupiedMap(s.boxes, [id]))) return false;
    set({
      boxes: s.boxes.map((b) => (b.id === id ? { ...b, x, y } : b)),
      past: [...s.past, snapshot(s)],
      future: []
    });
    return true;
  },

  moveSelected(dx, dy) {
    const s = get();
    if (s.selectedIds.length === 0 || (dx === 0 && dy === 0)) return false;
    const ids = new Set(s.selectedIds);
    const occ = occupiedMap(s.boxes, ids);
    const updates = new Map<string, PlacedBox>();
    for (const b of s.boxes) {
      if (!ids.has(b.id)) continue;
      const nx = b.x + dx;
      const ny = b.y + dy;
      if (!fits(nx, ny, b.widthCells, b.depthCells, occ)) return false;
      const moved: PlacedBox = { ...b, x: nx, y: ny };
      updates.set(b.id, moved);
      markOccupancy(occ, nx, ny, b.widthCells, b.depthCells);
    }
    set({
      boxes: s.boxes.map((b) => updates.get(b.id) ?? b),
      past: [...s.past, snapshot(s)],
      future: []
    });
    return true;
  },

  resizeBox(id, widthCells, depthCells) {
    const s = get();
    const box = s.boxes.find((b) => b.id === id);
    if (!box) return false;
    const w = Math.max(SYSTEM.minCells, Math.min(SYSTEM.maxCells, Math.round(widthCells)));
    const d = Math.max(SYSTEM.minCells, Math.min(SYSTEM.maxCells, Math.round(depthCells)));
    if (w === box.widthCells && d === box.depthCells) return true;
    if (!fits(box.x, box.y, w, d, occupiedMap(s.boxes, [id]))) return false;
    set({
      boxes: s.boxes.map((b) => (b.id === id ? { ...b, widthCells: w, depthCells: d } : b)),
      past: [...s.past, snapshot(s)],
      future: []
    });
    return true;
  },

  rotateBox(id) {
    const s = get();
    const box = s.boxes.find((b) => b.id === id);
    if (!box) return false;
    if (box.widthCells === box.depthCells) return true;
    if (!fits(box.x, box.y, box.depthCells, box.widthCells, occupiedMap(s.boxes, [id]))) {
      return false;
    }
    set({
      boxes: s.boxes.map((b) =>
        b.id === id ? { ...b, widthCells: box.depthCells, depthCells: box.widthCells } : b
      ),
      past: [...s.past, snapshot(s)],
      future: []
    });
    return true;
  },

  rotateSelected() {
    const s = get();
    if (s.selectedIds.length === 0) return 0;
    const ids = new Set(s.selectedIds);
    const occ = occupiedMap(s.boxes, ids);
    const updates = new Map<string, PlacedBox>();
    for (const b of s.boxes) {
      if (!ids.has(b.id)) continue;
      if (b.widthCells === b.depthCells) {
        markOccupancy(occ, b.x, b.y, b.widthCells, b.depthCells);
        continue;
      }
      if (!fits(b.x, b.y, b.depthCells, b.widthCells, occ)) {
        markOccupancy(occ, b.x, b.y, b.widthCells, b.depthCells);
        continue;
      }
      const rotated: PlacedBox = { ...b, widthCells: b.depthCells, depthCells: b.widthCells };
      updates.set(b.id, rotated);
      markOccupancy(occ, b.x, b.y, rotated.widthCells, rotated.depthCells);
    }
    if (updates.size === 0) return 0;
    set({
      boxes: s.boxes.map((b) => updates.get(b.id) ?? b),
      past: [...s.past, snapshot(s)],
      future: []
    });
    return updates.size;
  },

  duplicateBox(id) {
    const s = get();
    const box = s.boxes.find((b) => b.id === id);
    if (!box) return null;
    const occ = occupiedMap(s.boxes);
    const slot = findFreeSlot(occ, box.widthCells, box.depthCells, { x: box.x, y: box.y });
    if (!slot) return null;
    const copy: PlacedBox = { ...box, id: makeId(), x: slot.x, y: slot.y };
    set({
      boxes: [...s.boxes, copy],
      past: [...s.past, snapshot(s)],
      future: [],
      selectedIds: [copy.id],
      selectedId: copy.id
    });
    return copy;
  },

  duplicateSelected() {
    const s = get();
    if (s.selectedIds.length === 0) return 0;
    const occ = occupiedMap(s.boxes);
    const newBoxes: PlacedBox[] = [];
    const newIds: string[] = [];
    for (const id of s.selectedIds) {
      const box = s.boxes.find((b) => b.id === id);
      if (!box) continue;
      const slot = findFreeSlot(occ, box.widthCells, box.depthCells, { x: box.x, y: box.y });
      if (!slot) continue;
      const copy: PlacedBox = { ...box, id: makeId(), x: slot.x, y: slot.y };
      newBoxes.push(copy);
      newIds.push(copy.id);
      markOccupancy(occ, copy.x, copy.y, copy.widthCells, copy.depthCells);
    }
    if (newBoxes.length === 0) return 0;
    set({
      boxes: [...s.boxes, ...newBoxes],
      past: [...s.past, snapshot(s)],
      future: [],
      selectedIds: newIds,
      selectedId: primaryId(newIds)
    });
    return newBoxes.length;
  },

  setBoxHeight(id, mm) {
    const s = get();
    const box = s.boxes.find((b) => b.id === id);
    if (!box) return;
    const clamped = Math.min(SYSTEM.maxHeightMm, Math.max(SYSTEM.minHeightMm, mm));
    if (Math.abs(clamped - box.heightMm) < 1e-6) return;
    set({
      boxes: s.boxes.map((b) => (b.id === id ? { ...b, heightMm: clamped } : b)),
      past: [...s.past, snapshot(s)],
      future: []
    });
  },

  select(id) {
    const next = id ? [id] : [];
    set({ selectedIds: next, selectedId: primaryId(next) });
  },

  toggleSelect(id) {
    const s = get();
    if (!s.boxes.some((b) => b.id === id)) return;
    const has = s.selectedIds.includes(id);
    const next = has ? s.selectedIds.filter((sid) => sid !== id) : [...s.selectedIds, id];
    set({ selectedIds: next, selectedId: primaryId(next) });
  },

  selectMany(ids) {
    const s = get();
    const known = new Set(s.boxes.map((b) => b.id));
    const dedup: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      if (!known.has(id) || seen.has(id)) continue;
      seen.add(id);
      dedup.push(id);
    }
    set({ selectedIds: dedup, selectedId: primaryId(dedup) });
  },

  clearSelection() {
    set({ selectedIds: [], selectedId: null });
  },

  setHeightMm(mm) {
    const clamped = Math.min(SYSTEM.maxHeightMm, Math.max(SYSTEM.minHeightMm, mm));
    set({ selectedHeightMm: clamped });
  },

  undo() {
    const s = get();
    if (s.past.length === 0) return;
    const previous = s.past[s.past.length - 1]!;
    set({
      boxes: previous.boxes,
      past: s.past.slice(0, -1),
      future: [snapshot(s), ...s.future],
      selectedIds: [],
      selectedId: null
    });
  },

  redo() {
    const s = get();
    if (s.future.length === 0) return;
    const next = s.future[0]!;
    set({
      boxes: next.boxes,
      past: [...s.past, snapshot(s)],
      future: s.future.slice(1),
      selectedIds: [],
      selectedId: null
    });
  },

  reset() {
    const s = get();
    if (s.boxes.length === 0) return;
    set({
      boxes: [],
      past: [...s.past, snapshot(s)],
      future: [],
      selectedIds: [],
      selectedId: null
    });
  },

  loadBoxes(incoming, selectedHeightMm) {
    const s = get();
    const occ = new Set<number>();
    const placed: PlacedBox[] = [];
    let skipped = 0;
    for (const b of incoming) {
      if (fits(b.x, b.y, b.widthCells, b.depthCells, occ)) {
        placed.push({ id: makeId(), ...b });
        markOccupancy(occ, b.x, b.y, b.widthCells, b.depthCells);
      } else {
        skipped++;
      }
    }
    const nextHeight =
      selectedHeightMm !== undefined
        ? Math.min(SYSTEM.maxHeightMm, Math.max(SYSTEM.minHeightMm, selectedHeightMm))
        : s.selectedHeightMm;
    set({
      boxes: placed,
      past: [...s.past, snapshot(s)],
      future: [],
      selectedIds: [],
      selectedId: null,
      selectedHeightMm: nextHeight
    });
    return { placed: placed.length, skipped };
  },

  applyFillPlan(plan, heightMm) {
    const s = get();
    if (plan.length === 0) return 0;
    const occ = occupiedMap(s.boxes);
    const created: PlacedBox[] = [];
    const h =
      heightMm !== undefined
        ? Math.min(SYSTEM.maxHeightMm, Math.max(SYSTEM.minHeightMm, heightMm))
        : s.selectedHeightMm;
    for (const entry of plan) {
      if (!fits(entry.x, entry.y, entry.widthCells, entry.depthCells, occ)) continue;
      created.push({
        id: makeId(),
        x: entry.x,
        y: entry.y,
        widthCells: entry.widthCells,
        depthCells: entry.depthCells,
        heightMm: h
      });
      markOccupancy(occ, entry.x, entry.y, entry.widthCells, entry.depthCells);
    }
    if (created.length === 0) return 0;
    const newIds = created.map((b) => b.id);
    set({
      boxes: [...s.boxes, ...created],
      past: [...s.past, snapshot(s)],
      future: [],
      selectedIds: newIds,
      selectedId: primaryId(newIds)
    });
    return created.length;
  }
}));

export const _internalForTests = { occupiedMap, fits };
