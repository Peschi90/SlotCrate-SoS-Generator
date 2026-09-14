import { SYSTEM } from "./system";
import type { InlayCutout } from "./schema";

export interface InlayDemandItem {
  id: string;
  diameterMm: number;
  count: number;
}

export interface DualLevelPlacementResult {
  level1Cutouts: InlayCutout[];
  level2Cutouts: InlayCutout[];
  totalRequestedCount: number;
  placedCount: number;
  fitsAll: boolean;
  occupancyPercent: number;
  level1OccupancyPercent: number;
  level2OccupancyPercent: number;
  unplacedCount: number;
  unplacedItems: Array<{ diameterMm: number; count: number }>;
}

const MIN_MARGIN = SYSTEM.inlayMinMarginMm; // 2.6 mm
const CENTER_X = SYSTEM.inlayCenterXMm; // 28.7 mm

// Ebene 1 (unten, breiter): max 42 mm
const L1_BOUND_X_MIN = SYSTEM.inlayLevel1ShelfXMinMm + MIN_MARGIN; // 3.7 + 2.6 = 6.3 mm
const L1_BOUND_X_MAX = SYSTEM.inlayLevel1ShelfXMaxMm - MIN_MARGIN; // 53.7 - 2.6 = 51.1 mm
const L1_BOUND_Y_MIN = SYSTEM.inlayLevel1ShelfYMinMm + MIN_MARGIN; // 4.5 + 2.6 = 7.1 mm
const L1_BOUND_Y_MAX = SYSTEM.inlayLevel1ShelfYMaxMm - MIN_MARGIN; // 224.6 - 2.6 = 222.0 mm
const L1_MAX_DIA = SYSTEM.inlayLevel1MaxCutoutDiameterMm; // 42.0 mm
const L1_USABLE_Y_LENGTH = L1_BOUND_Y_MAX - L1_BOUND_Y_MIN; // 214.9 mm

// Ebene 2 (oben, Standard): max 36.2 mm
const L2_BOUND_X_MIN = SYSTEM.inlayLevel2ShelfXMinMm + MIN_MARGIN; // 8.0 + 2.6 = 10.6 mm
const L2_BOUND_X_MAX = SYSTEM.inlayLevel2ShelfXMaxMm - MIN_MARGIN; // 49.4 - 2.6 = 46.8 mm
const L2_BOUND_Y_MIN = SYSTEM.inlayLevel2ShelfYMinMm + MIN_MARGIN; // 4.5 + 2.6 = 7.1 mm
const L2_BOUND_Y_MAX = SYSTEM.inlayLevel2ShelfYMaxMm - MIN_MARGIN; // 221.7 - 2.6 = 219.1 mm
const L2_MAX_DIA = SYSTEM.inlayLevel2MaxCutoutDiameterMm; // 36.2 mm
const L2_USABLE_Y_LENGTH = L2_BOUND_Y_MAX - L2_BOUND_Y_MIN; // 212.0 mm

const MIN_HOLE_SPACING_MM = 2.0;

function round(val: number, decimals: number = 1): number {
  const f = Math.pow(10, decimals);
  return Math.round(val * f) / f;
}

interface ShelfBounds {
  boundXMin: number;
  boundXMax: number;
  boundYMin: number;
  boundYMax: number;
  maxDiameter: number;
  usableYLength: number;
}

const L1_BOUNDS: ShelfBounds = {
  boundXMin: L1_BOUND_X_MIN,
  boundXMax: L1_BOUND_X_MAX,
  boundYMin: L1_BOUND_Y_MIN,
  boundYMax: L1_BOUND_Y_MAX,
  maxDiameter: L1_MAX_DIA,
  usableYLength: L1_USABLE_Y_LENGTH
};

const L2_BOUNDS: ShelfBounds = {
  boundXMin: L2_BOUND_X_MIN,
  boundXMax: L2_BOUND_X_MAX,
  boundYMin: L2_BOUND_Y_MIN,
  boundYMax: L2_BOUND_Y_MAX,
  maxDiameter: L2_MAX_DIA,
  usableYLength: L2_USABLE_Y_LENGTH
};

function tryPlaceOnShelf(
  shelf: ShelfBounds,
  existing: InlayCutout[],
  dia: number,
  staggerLeftState: { value: boolean }
): { cutout: InlayCutout; fits: boolean } {
  const r = dia / 2.0;
  if (dia > shelf.maxDiameter + 1e-4) {
    return { cutout: { diameterMm: dia, centerXMm: CENTER_X, centerYMm: 0 }, fits: false };
  }

  const minX = shelf.boundXMin + r;
  const maxX = shelf.boundXMax - r;
  const canStagger = maxX - minX >= 5.0 && dia <= 26.0;

  let targetX = CENTER_X;
  let targetY = shelf.boundYMin + r;

  if (existing.length === 0) {
    if (canStagger) {
      targetX = staggerLeftState.value ? minX : maxX;
      staggerLeftState.value = !staggerLeftState.value;
    } else {
      targetX = CENTER_X;
    }
    targetY = shelf.boundYMin + r;
  } else {
    const prev = existing[existing.length - 1]!;
    const prevR = prev.diameterMm / 2.0;
    const minDistance = r + prevR + MIN_HOLE_SPACING_MM;

    if (canStagger && prev.diameterMm <= 26.0) {
      targetX = staggerLeftState.value ? minX : maxX;
      staggerLeftState.value = !staggerLeftState.value;
      const dx = Math.abs(targetX - prev.centerXMm);
      if (minDistance > dx) {
        const dy = Math.sqrt(Math.max(0, minDistance * minDistance - dx * dx));
        targetY = prev.centerYMm + dy;
      } else {
        targetY = prev.centerYMm + minDistance;
      }
    } else {
      targetX = CENTER_X;
      targetY = prev.centerYMm + minDistance;
    }
  }

  if (targetY + r > shelf.boundYMax + 1e-4) {
    return { cutout: { diameterMm: dia, centerXMm: CENTER_X, centerYMm: targetY }, fits: false };
  }

  return {
    cutout: {
      diameterMm: round(dia, 1),
      centerXMm: round(targetX, 1),
      centerYMm: round(targetY, 1)
    },
    fits: true
  };
}

/**
 * Automatischer Belegungsassistent für beide Ebenen:
 * Verteilt eine Liste an gewünschten Behältern intelligent über Ebene 1 (unten, breiter)
 * und Ebene 2 (oben, Standard).
 *
 * Logik:
 * 1. Große Behälter (> 36.2 mm) MÜSSEN auf Ebene 1 (da Ebene 2 max 36.2 mm fasst).
 * 2. Mittlere & kleinere Behälter werden optimal einsortiert, um den Bauraum auf beiden Ebenen ideal auszunutzen.
 */
export function calculateDualLevelPlacement(
  demand: InlayDemandItem[],
  existingL1: InlayCutout[] = [],
  existingL2: InlayCutout[] = [],
  mode: "replace" | "append" = "replace"
): DualLevelPlacementResult {
  const requestedDiameters: number[] = [];
  for (const item of demand) {
    const dia = Math.min(
      SYSTEM.inlayLevel1MaxCutoutDiameterMm,
      Math.max(SYSTEM.inlayMinCutoutDiameterMm, item.diameterMm)
    );
    const count = Math.max(0, Math.floor(item.count));
    for (let i = 0; i < count; i++) {
      requestedDiameters.push(dia);
    }
  }

  // Sort descending by diameter to place larger vessels first
  requestedDiameters.sort((a, b) => b - a);

  const placedL1: InlayCutout[] = mode === "append" ? [...existingL1] : [];
  const placedL2: InlayCutout[] = mode === "append" ? [...existingL2] : [];

  const staggerStateL1 = { value: true };
  const staggerStateL2 = { value: true };
  const unplacedMap = new Map<number, number>();

  for (const dia of requestedDiameters) {
    // 1. Wenn Durchmesser > 36.2 mm, passt er nur auf Ebene 1
    if (dia > L2_MAX_DIA + 1e-4) {
      const res1 = tryPlaceOnShelf(L1_BOUNDS, placedL1, dia, staggerStateL1);
      if (res1.fits && placedL1.length < SYSTEM.inlayMaxCutoutsPerLevel) {
        placedL1.push(res1.cutout);
      } else {
        unplacedMap.set(dia, (unplacedMap.get(dia) ?? 0) + 1);
      }
      continue;
    }

    // 2. Für Größen <= 36.2 mm: Versuche Ebene 1 zuerst, falls noch Platz, sonst Ebene 2
    const res1 = tryPlaceOnShelf(L1_BOUNDS, placedL1, dia, staggerStateL1);
    if (res1.fits && placedL1.length < SYSTEM.inlayMaxCutoutsPerLevel) {
      placedL1.push(res1.cutout);
    } else {
      const res2 = tryPlaceOnShelf(L2_BOUNDS, placedL2, dia, staggerStateL2);
      if (res2.fits && placedL2.length < SYSTEM.inlayMaxCutoutsPerLevel) {
        placedL2.push(res2.cutout);
      } else {
        unplacedMap.set(dia, (unplacedMap.get(dia) ?? 0) + 1);
      }
    }
  }

  const unplacedItems: Array<{ diameterMm: number; count: number }> = [];
  let unplacedCount = 0;
  for (const [dia, cnt] of unplacedMap.entries()) {
    unplacedItems.push({ diameterMm: dia, count: cnt });
    unplacedCount += cnt;
  }

  // Calculate occupancy percentage for each level
  let l1Occupancy = 0;
  if (placedL1.length > 0) {
    const last = placedL1[placedL1.length - 1]!;
    const usedY = last.centerYMm + last.diameterMm / 2 - L1_BOUND_Y_MIN;
    l1Occupancy = Math.min(100, round((usedY / L1_USABLE_Y_LENGTH) * 100, 0));
  }

  let l2Occupancy = 0;
  if (placedL2.length > 0) {
    const last = placedL2[placedL2.length - 1]!;
    const usedY = last.centerYMm + last.diameterMm / 2 - L2_BOUND_Y_MIN;
    l2Occupancy = Math.min(100, round((usedY / L2_USABLE_Y_LENGTH) * 100, 0));
  }

  const totalOccupancy = round((l1Occupancy + l2Occupancy) / 2.0, 0);
  const placedTotal =
    placedL1.length +
    placedL2.length -
    (mode === "append" ? existingL1.length + existingL2.length : 0);

  return {
    level1Cutouts: placedL1,
    level2Cutouts: placedL2,
    totalRequestedCount: requestedDiameters.length,
    placedCount: placedTotal,
    fitsAll: unplacedCount === 0,
    occupancyPercent: totalOccupancy,
    level1OccupancyPercent: l1Occupancy,
    level2OccupancyPercent: l2Occupancy,
    unplacedCount,
    unplacedItems
  };
}

    occupancyPercent,
    unplacedCount,
    unplacedItems
  };
}
