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

interface LayoutState {
  boxes: PlacedBox[];
  selectedId: string | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  selectedHeightMm: number;

  addBox(x: number, y: number, widthCells: number, depthCells: number, heightMm?: number): PlacedBox | null;
  removeBox(id: string): void;
  moveBox(id: string, x: number, y: number): boolean;
  select(id: string | null): void;
  setHeightMm(mm: number): void;
  undo(): void;
  redo(): void;
  reset(): void;
  canPlace(x: number, y: number, widthCells: number, depthCells: number, ignoreId?: string): boolean;
}

function occupiedMap(boxes: PlacedBox[], ignoreId?: string): Set<number> {
  const occ = new Set<number>();
  for (const b of boxes) {
    if (b.id === ignoreId) continue;
    for (let i = b.x; i < b.x + b.widthCells; i++) {
      for (let j = b.y; j < b.y + b.depthCells; j++) {
        occ.add(i * SYSTEM.gridColumns + j);
      }
    }
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

export const useLayoutStore = create<LayoutState>((set, get) => ({
  boxes: [],
  selectedId: null,
  past: [],
  future: [],
  selectedHeightMm: SYSTEM.defaultBoxHeightMm,

  canPlace(x, y, w, d, ignoreId) {
    return fits(x, y, w, d, occupiedMap(get().boxes, ignoreId));
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
      selectedId: box.id
    });
    return box;
  },

  removeBox(id) {
    const s = get();
    if (!s.boxes.some((b) => b.id === id)) return;
    set({
      boxes: s.boxes.filter((b) => b.id !== id),
      past: [...s.past, snapshot(s)],
      future: [],
      selectedId: s.selectedId === id ? null : s.selectedId
    });
  },

  moveBox(id, x, y) {
    const s = get();
    const box = s.boxes.find((b) => b.id === id);
    if (!box) return false;
    if (!fits(x, y, box.widthCells, box.depthCells, occupiedMap(s.boxes, id))) return false;
    set({
      boxes: s.boxes.map((b) => (b.id === id ? { ...b, x, y } : b)),
      past: [...s.past, snapshot(s)],
      future: []
    });
    return true;
  },

  select(id) {
    set({ selectedId: id });
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
      selectedId: null
    });
  }
}));

export const _internalForTests = { occupiedMap, fits };
