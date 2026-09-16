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
  inlayCenterXMm: 28.7,
  inlayMinMarginMm: 2.6,
  inlayMinHoleSpacingMm: 2.6,
  inlayMinCutoutDiameterMm: 5.0,
  inlayMaxCutoutDiameterMm: 42.0,
  inlayMaxCutoutsPerLevel: 50,
  inlayLevel1ShelfZMm: 28.6,
  inlayLevel1ShelfXMinMm: 3.7,
  inlayLevel1ShelfXMaxMm: 53.7,
  inlayLevel1ShelfYMinMm: 4.5,
  inlayLevel1ShelfYMaxMm: 224.6,
  inlayLevel1MaxCutoutDiameterMm: 42.0,
  inlayLevel2ShelfZMm: 128.9,
  inlayLevel2ShelfXMinMm: 8.0,
  inlayLevel2ShelfXMaxMm: 49.4,
  inlayLevel2ShelfYMinMm: 4.5,
  inlayLevel2ShelfYMaxMm: 221.7,
  inlayLevel2MaxCutoutDiameterMm: 36.2,
  coverWidthMm: 116,
  coverDepthMm: 216,
  coverHeightMm: 3,
  coverGrooveDepthMm: 0.2,
  coverGrooveWidthMm: 0.4,
  coverEdgeMarginMm: 8,
  coverMinFontSizeMm: 6,
  coverMaxFontSizeMm: 60,
  coverFonts: [
    { value: "Roboto Condensed", label: "Roboto Condensed" },
    { value: "Barlow Condensed", label: "Barlow Condensed" },
    { value: "Oswald", label: "Oswald" },
    { value: "Rajdhani", label: "Rajdhani" },
    { value: "Chakra Petch", label: "Chakra Petch" },
    { value: "Saira Condensed", label: "Saira Condensed" },
    { value: "Archivo Black", label: "Archivo Black" },
    { value: "Bebas Neue", label: "Bebas Neue" },
    { value: "Anton", label: "Anton" },
    { value: "Russo One", label: "Russo One" },
    { value: "Teko", label: "Teko" },
    { value: "Black Ops One", label: "Black Ops One" },
    { value: "Audiowide", label: "Audiowide" },
    { value: "Orbitron", label: "Orbitron" },
    { value: "Michroma", label: "Michroma" },
    { value: "Exo 2", label: "Exo 2" },
    { value: "Righteous", label: "Righteous" },
    { value: "Arial", label: "Arial" }
  ],
  coverVariantId: "sc-124-v2",
  coverMaxTextLength: 24,
  // Fallbacks
  inlayShelfUsableXMinMm: 3.7,
  inlayShelfUsableXMaxMm: 53.7,
  inlayShelfUsableYMinMm: 4.5,
  inlayShelfUsableYMaxMm: 224.6,
  geometryVersion: "slotcrate-v1"
} as const;

export function previewFontFamily(fontName: string): string {
  switch (fontName) {
    case "Arial":
      return "Arial, sans-serif";
    case "Roboto Condensed": return "var(--font-roboto-condensed)";
    case "Barlow Condensed": return "var(--font-barlow-condensed)";
    case "Oswald": return "var(--font-oswald)";
    case "Rajdhani": return "var(--font-rajdhani)";
    case "Chakra Petch": return "var(--font-chakra-petch)";
    case "Saira Condensed": return "var(--font-saira-condensed)";
    case "Archivo Black": return "var(--font-archivo-black)";
    case "Bebas Neue": return "var(--font-bebas-neue)";
    case "Anton": return "var(--font-anton)";
    case "Russo One": return "var(--font-russo-one)";
    case "Teko": return "var(--font-teko)";
    case "Black Ops One": return "var(--font-black-ops-one)";
    case "Audiowide": return "var(--font-audiowide)";
    case "Orbitron": return "var(--font-orbitron)";
    case "Michroma": return "var(--font-michroma)";
    case "Exo 2": return "var(--font-exo-2)";
    case "Righteous": return "var(--font-righteous)";
    default:
      return `"${fontName}", sans-serif`;
  }
}

export function resolvePreviewFontFamily(fontName: string): string {
  const family = previewFontFamily(fontName);
  if (!family.startsWith("var(")) return family;
  const variableName = family.slice(4, -1).trim();
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || "sans-serif";
}

export type SystemConstants = typeof SYSTEM;
