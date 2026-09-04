/**
 * Systemkonstanten, die im Frontend NUR zur Darstellung genutzt werden.
 * Autoritative Werte kommen vom Server via `/v1/settings/active`.
 * Diese Werte dienen als Fallback, wenn die API noch nicht geantwortet hat.
 */
export const SYSTEM = {
  gridColumns: 10,
  gridRows: 10,
  gridPitchMm: 21.09,
  defaultBoxHeightMm: 35.8,
  wallThicknessMm: 1.2,
  floorThicknessMm: 1.0,
  pickupTopZMm: 4.0,
  minCells: 1,
  maxCells: 10,
  minHeightMm: 6.0,
  maxHeightMm: 200.0,
  geometryVersion: "slotcrate-v1"
} as const;

export type SystemConstants = typeof SYSTEM;
