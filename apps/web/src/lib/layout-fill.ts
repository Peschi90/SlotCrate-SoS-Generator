import { SYSTEM } from "./system";
import type { FillPlanEntry, PlacedBox } from "./layout-store";

/**
 * Reine (test-freundliche) Helfer für die Auto-Fill-Funktionen des Planers.
 * Enthalten keine Zustand-Zugriffe.
 */

export interface OccupancyGrid {
  cols: number;
  rows: number;
  occupied: boolean[][]; // occupied[y][x]
}

export function buildOccupancy(
  boxes: Array<Pick<PlacedBox, "x" | "y" | "widthCells" | "depthCells">>,
  cols: number = SYSTEM.gridColumns,
  rows: number = SYSTEM.gridRows
): OccupancyGrid {
  const occupied: boolean[][] = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  for (const b of boxes) {
    for (let y = b.y; y < b.y + b.depthCells; y++) {
      for (let x = b.x; x < b.x + b.widthCells; x++) {
        if (y >= 0 && y < rows && x >= 0 && x < cols) occupied[y]![x] = true;
      }
    }
  }
  return { cols, rows, occupied };
}

function areaFree(grid: OccupancyGrid, x: number, y: number, w: number, d: number): boolean {
  if (x < 0 || y < 0 || x + w > grid.cols || y + d > grid.rows) return false;
  for (let j = y; j < y + d; j++) {
    for (let i = x; i < x + w; i++) {
      if (grid.occupied[j]![i]) return false;
    }
  }
  return true;
}

function markArea(grid: OccupancyGrid, x: number, y: number, w: number, d: number): void {
  for (let j = y; j < y + d; j++) {
    for (let i = x; i < x + w; i++) {
      grid.occupied[j]![i] = true;
    }
  }
}

/**
 * Row-major Auffüllen mit einer festen Größe (z. B. 1×1 oder 2×2).
 * Größen, die die Variantengrenzen überschreiten, werden abgeschnitten.
 */
export function planFillWithSize(
  boxes: Array<Pick<PlacedBox, "x" | "y" | "widthCells" | "depthCells">>,
  widthCells: number,
  depthCells: number,
  limits: { maxWidthCells: number; maxDepthCells: number } = {
    maxWidthCells: SYSTEM.maxCells,
    maxDepthCells: SYSTEM.maxCells
  }
): FillPlanEntry[] {
  const w = Math.max(1, Math.min(limits.maxWidthCells, widthCells));
  const d = Math.max(1, Math.min(limits.maxDepthCells, depthCells));
  const grid = buildOccupancy(boxes);
  const plan: FillPlanEntry[] = [];
  for (let y = 0; y <= grid.rows - d; y++) {
    for (let x = 0; x <= grid.cols - w; x++) {
      if (areaFree(grid, x, y, w, d)) {
        plan.push({ x, y, widthCells: w, depthCells: d });
        markArea(grid, x, y, w, d);
      }
    }
  }
  return plan;
}

function largestFreeRect(
  grid: OccupancyGrid,
  x: number,
  y: number,
  maxW: number,
  maxD: number
): { w: number; d: number } | null {
  if (grid.occupied[y]![x]) return null;
  let maxWidthHere = 0;
  for (let i = x; i < Math.min(x + maxW, grid.cols); i++) {
    if (grid.occupied[y]![i]) break;
    maxWidthHere++;
  }
  let best: { w: number; d: number } = { w: 1, d: 1 };
  for (let w = 1; w <= maxWidthHere; w++) {
    let d = 0;
    outer: for (let j = y; j < Math.min(y + maxD, grid.rows); j++) {
      for (let i = x; i < x + w; i++) {
        if (grid.occupied[j]![i]) break outer;
      }
      d++;
    }
    if (w * d > best.w * best.d) best = { w, d };
  }
  return best;
}

/**
 * Auffüllen mit dem jeweils größtmöglichen Rechteck, das an einem freien
 * Top-Left-Startpunkt Platz findet. Wenn `preferred` gesetzt ist und passt,
 * wird es bevorzugt platziert, ansonsten der maximale Bereich.
 */
export function planFillLargest(
  boxes: Array<Pick<PlacedBox, "x" | "y" | "widthCells" | "depthCells">>,
  limits: { maxWidthCells: number; maxDepthCells: number } = {
    maxWidthCells: SYSTEM.maxCells,
    maxDepthCells: SYSTEM.maxCells
  },
  preferred?: { widthCells: number; depthCells: number }
): FillPlanEntry[] {
  const grid = buildOccupancy(boxes);
  const plan: FillPlanEntry[] = [];
  const maxW = Math.max(1, Math.min(SYSTEM.maxCells, limits.maxWidthCells));
  const maxD = Math.max(1, Math.min(SYSTEM.maxCells, limits.maxDepthCells));
  const pref = preferred
    ? {
        w: Math.max(1, Math.min(maxW, preferred.widthCells)),
        d: Math.max(1, Math.min(maxD, preferred.depthCells))
      }
    : null;
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (grid.occupied[y]![x]) continue;
      let choice: { w: number; d: number } | null = null;
      if (pref && areaFree(grid, x, y, pref.w, pref.d)) {
        choice = { w: pref.w, d: pref.d };
      } else {
        choice = largestFreeRect(grid, x, y, maxW, maxD);
      }
      if (!choice) continue;
      plan.push({ x, y, widthCells: choice.w, depthCells: choice.d });
      markArea(grid, x, y, choice.w, choice.d);
    }
  }
  return plan;
}

/**
 * Analyse verbleibender freier Zellen. Nutzt Flood-Fill zur Erkennung
 * zusammenhängender Regionen. Regionen mit ≤ `thresholdCells` Zellen gelten
 * als "kleine Restfläche" und werden separat gezählt.
 */
export interface FreeCellReport {
  freeCells: number;
  freeCoords: Array<{ x: number; y: number }>;
  regions: Array<{ cells: number; coords: Array<{ x: number; y: number }> }>;
  smallRegions: number;
  smallRegionCells: number;
}

export function analyzeFreeCells(
  boxes: Array<Pick<PlacedBox, "x" | "y" | "widthCells" | "depthCells">>,
  thresholdCells = 2
): FreeCellReport {
  const grid = buildOccupancy(boxes);
  const visited: boolean[][] = Array.from({ length: grid.rows }, () => Array<boolean>(grid.cols).fill(false));
  const freeCoords: Array<{ x: number; y: number }> = [];
  const regions: Array<{ cells: number; coords: Array<{ x: number; y: number }> }> = [];
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (grid.occupied[y]![x]) continue;
      freeCoords.push({ x, y });
      if (visited[y]![x]) continue;
      const coords: Array<{ x: number; y: number }> = [];
      const stack: Array<{ x: number; y: number }> = [{ x, y }];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (cur.x < 0 || cur.y < 0 || cur.x >= grid.cols || cur.y >= grid.rows) continue;
        if (visited[cur.y]![cur.x] || grid.occupied[cur.y]![cur.x]) continue;
        visited[cur.y]![cur.x] = true;
        coords.push(cur);
        stack.push({ x: cur.x + 1, y: cur.y });
        stack.push({ x: cur.x - 1, y: cur.y });
        stack.push({ x: cur.x, y: cur.y + 1 });
        stack.push({ x: cur.x, y: cur.y - 1 });
      }
      regions.push({ cells: coords.length, coords });
    }
  }
  const smallRegionsList = regions.filter((r) => r.cells <= thresholdCells);
  return {
    freeCells: freeCoords.length,
    freeCoords,
    regions,
    smallRegions: smallRegionsList.length,
    smallRegionCells: smallRegionsList.reduce((acc, r) => acc + r.cells, 0)
  };
}
