import { SYSTEM } from "./system";
import type { InlayCutout } from "./schema";

export interface InlayDemandItem {
  id: string;
  diameterMm: number;
  count: number;
}

export interface InlayPlacementResult {
  cutouts: InlayCutout[];
  placedCount: number;
  totalRequestedCount: number;
  fitsAll: boolean;
  occupancyPercent: number;
  unplacedCount: number;
  unplacedItems: Array<{ diameterMm: number; count: number }>;
}

const SHELF_X_MIN = SYSTEM.inlayShelfUsableXMinMm; // 8.0 mm
const SHELF_X_MAX = SYSTEM.inlayShelfUsableXMaxMm; // 49.4 mm
const SHELF_Y_MIN = SYSTEM.inlayShelfUsableYMinMm; // 5.0 mm
const SHELF_Y_MAX = SYSTEM.inlayShelfUsableYMaxMm; // 218.0 mm
const MIN_MARGIN = SYSTEM.inlayMinMarginMm; // 2.6 mm
const CENTER_X = SYSTEM.inlayCenterXMm; // 28.7 mm

const BOUND_X_MIN = SHELF_X_MIN + MIN_MARGIN; // 10.6 mm
const BOUND_X_MAX = SHELF_X_MAX - MIN_MARGIN; // 46.8 mm
const BOUND_Y_MIN = SHELF_Y_MIN + MIN_MARGIN; // 7.6 mm
const BOUND_Y_MAX = SHELF_Y_MAX - MIN_MARGIN; // 215.4 mm
const TOTAL_USABLE_Y_LENGTH = BOUND_Y_MAX - BOUND_Y_MIN; // 207.8 mm

const MIN_HOLE_SPACING_MM = 2.0;

function round(val: number, decimals: number = 1): number {
  const f = Math.pow(10, decimals);
  return Math.round(val * f) / f;
}

/**
 * Berechnet eine kollisionsfreie, platzoptimierte Anordnung für eine Liste von
 * gewünschten Bohrungsdurchmessern auf einem Regalboden.
 *
 * Größere Bohrungen werden zentriert platziert, kleinere Bohrungen (bis ~25mm)
 * können im Zick-Zack-Muster links/rechts gestaffelt werden, um die Packungsdichte zu maximieren.
 */
export function calculateInlayPlacement(
  demand: InlayDemandItem[],
  existingCutouts: InlayCutout[] = [],
  mode: "replace" | "append" = "replace"
): InlayPlacementResult {
  // Expand demand items into individual diameters
  const requestedDiameters: number[] = [];
  for (const item of demand) {
    const dia = Math.min(
      SYSTEM.inlayMaxCutoutDiameterMm,
      Math.max(SYSTEM.inlayMinCutoutDiameterMm, item.diameterMm)
    );
    const count = Math.max(0, Math.floor(item.count));
    for (let i = 0; i < count; i++) {
      requestedDiameters.push(dia);
    }
  }

  const totalRequestedCount = requestedDiameters.length;
  if (totalRequestedCount === 0 && mode === "replace") {
    return {
      cutouts: [],
      placedCount: 0,
      totalRequestedCount: 0,
      fitsAll: true,
      occupancyPercent: 0,
      unplacedCount: 0,
      unplacedItems: []
    };
  }

  const placed: InlayCutout[] = mode === "append" ? [...existingCutouts] : [];
  let staggerLeft = true;
  const unplacedMap = new Map<number, number>();

  for (const dia of requestedDiameters) {
    if (placed.length >= SYSTEM.inlayMaxCutoutsPerLevel) {
      unplacedMap.set(dia, (unplacedMap.get(dia) ?? 0) + 1);
      continue;
    }

    const r = dia / 2.0;
    const minX = BOUND_X_MIN + r;
    const maxX = BOUND_X_MAX - r;
    const canStagger = maxX - minX >= 6.0 && dia <= 26.0;

    let targetX: number = CENTER_X;
    let targetY: number = BOUND_Y_MIN + r;

    if (placed.length === 0) {
      if (canStagger) {
        targetX = staggerLeft ? minX : maxX;
        staggerLeft = !staggerLeft;
      } else {
        targetX = CENTER_X;
      }
      targetY = BOUND_Y_MIN + r;
    } else {
      // Position after previous placed cutouts
      const prev = placed[placed.length - 1]!;
      const prevR = prev.diameterMm / 2.0;
      const minDistance = r + prevR + MIN_HOLE_SPACING_MM;

      if (canStagger && prev.diameterMm <= 26.0) {
        targetX = staggerLeft ? minX : maxX;
        staggerLeft = !staggerLeft;
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

    // Check if hole fits within Y bounds
    if (targetY + r > BOUND_Y_MAX + 1e-3) {
      unplacedMap.set(dia, (unplacedMap.get(dia) ?? 0) + 1);
    } else {
      placed.push({
        diameterMm: round(dia, 1),
        centerXMm: round(targetX, 1),
        centerYMm: round(targetY, 1)
      });
    }
  }

  const unplacedItems: Array<{ diameterMm: number; count: number }> = [];
  let unplacedCount = 0;
  for (const [dia, cnt] of unplacedMap.entries()) {
    unplacedItems.push({ diameterMm: dia, count: cnt });
    unplacedCount += cnt;
  }

  // Calculate shelf occupancy percentage
  let occupancyPercent = 0;
  if (placed.length > 0) {
    const lastCutout = placed[placed.length - 1]!;
    const lastEdgeY = lastCutout.centerYMm + lastCutout.diameterMm / 2;
    const usedLength = Math.max(0, lastEdgeY - BOUND_Y_MIN);
    occupancyPercent = Math.min(100, round((usedLength / TOTAL_USABLE_Y_LENGTH) * 100, 0));
  }

  const placedNewCount = placed.length - (mode === "append" ? existingCutouts.length : 0);

  return {
    cutouts: placed,
    placedCount: placedNewCount,
    totalRequestedCount,
    fitsAll: unplacedCount === 0,
    occupancyPercent,
    unplacedCount,
    unplacedItems
  };
}
