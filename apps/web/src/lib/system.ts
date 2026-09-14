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
  minDividerOffsetMm: 0.1,
  minDividerHeightMm: 1.0,
  maxDividersPerBox: 32,
  minPocketDiameterMm: 3.0,
  maxPocketDiameterMm: 200.0,
  minPocketHeightMm: 1.0,
  maxPocketsPerBox: 1000,
  minWaveHeightMm: 2.0,
  minWaveGrooveDiameterMm: 4.0,
  maxWaveGrooveDiameterMm: 80.0,
  minWaveGrooveDepthMm: 0.5,
  minWaveGrooveCount: 1,
  maxWaveGrooveCount: 20,
  maxWaveInsertsPerBox: 16,
  inlayWidthMm: 57.4,
  inlayDepthMm: 224.6,
  inlayHeightMm: 215.4,
  inlayShelfUsableXMinMm: 8.0,
  inlayShelfUsableXMaxMm: 49.4,
  inlayShelfUsableYMinMm: 10.0,
  inlayShelfUsableYMaxMm: 215.0,
  inlayCenterXMm: 28.7,
  inlayMinCutoutDiameterMm: 5.0,
  inlayMaxCutoutDiameterMm: 45.0,
  inlayMaxCutoutsPerLevel: 50,
  inlayLevel1ShelfZMm: 28.6,
  inlayLevel2ShelfZMm: 128.9,
  geometryVersion: "slotcrate-v1"
} as const;

export type SystemConstants = typeof SYSTEM;
