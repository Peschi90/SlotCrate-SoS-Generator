import { z } from "zod";
import { SYSTEM } from "./system";

const cells = z.number().int().min(SYSTEM.minCells).max(SYSTEM.maxCells);
const heightMm = z.number().min(SYSTEM.minHeightMm).max(SYSTEM.maxHeightMm);
const gridPitchMm = z.number().min(15).max(30).default(SYSTEM.gridPitchMm);
const wallThicknessMm = z.number().min(0.6).max(4).default(SYSTEM.wallThicknessMm);
const innerFloorRadiusMm = z.number().min(0).max(4).default(2.5);
const outerClearanceMm = z.number().min(0).max(0.5).default(0);
const stlTessellationLinearMm = z.number().min(0.005).max(0.5).default(0.05);
const stlTessellationAngularRad = z.number().min(0.05).max(1.0).default(0.5);

export const dividerSchema = z.object({
  axis: z.enum(["x", "y"]),
  offsetMm: z
    .number()
    .min(SYSTEM.minDividerOffsetMm)
    .max(SYSTEM.maxCells * 30),
  heightMm: z.number().min(SYSTEM.minDividerHeightMm).max(SYSTEM.maxHeightMm)
});

export type Divider = z.infer<typeof dividerSchema>;

const dividers = z.array(dividerSchema).max(SYSTEM.maxDividersPerBox).default([]);

export const pocketSchema = z.object({
  centerXMm: z.number().min(0).max(SYSTEM.maxCells * 30),
  centerYMm: z.number().min(0).max(SYSTEM.maxCells * 30),
  diameterMm: z.number().min(SYSTEM.minPocketDiameterMm).max(SYSTEM.maxPocketDiameterMm),
  heightMm: z.number().min(SYSTEM.minPocketHeightMm).max(SYSTEM.maxHeightMm)
});

export type Pocket = z.infer<typeof pocketSchema>;

const pockets = z.array(pocketSchema).max(SYSTEM.maxPocketsPerBox).default([]);

export const waveInsertSchema = z.object({
  axis: z.enum(["x", "y"]),
  offsetMm: z.number().min(0).max(SYSTEM.maxCells * 30),
  heightMm: z.number().min(SYSTEM.minWaveHeightMm).max(SYSTEM.maxHeightMm),
  grooveDiameterMm: z
    .number()
    .min(SYSTEM.minWaveGrooveDiameterMm)
    .max(SYSTEM.maxWaveGrooveDiameterMm),
  grooveCount: z.number().int().min(SYSTEM.minWaveGrooveCount).max(SYSTEM.maxWaveGrooveCount),
  grooveDepthMm: z.number().min(SYSTEM.minWaveGrooveDepthMm).max(SYSTEM.maxWaveGrooveDiameterMm)
});

export type WaveInsert = z.infer<typeof waveInsertSchema>;

const waveInserts = z.array(waveInsertSchema).max(SYSTEM.maxWaveInsertsPerBox).default([]);

export const boxRequestSchema = z.object({
  widthCells: cells,
  depthCells: cells,
  heightMm: heightMm.default(SYSTEM.defaultBoxHeightMm),
  settingsVersion: z.number().int().min(1).default(1),
  gridPitchMm,
  wallThicknessMm,
  innerFloorRadiusMm,
  outerClearanceMm,
  stlTessellationLinearMm,
  stlTessellationAngularRad,
  dividers,
  pockets,
  pocketsFillOuter: z.boolean().default(false),
  waveInserts
});

export type BoxRequest = z.infer<typeof boxRequestSchema>;

export const plateRequestSchema = z.object({
  plateStepFile: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_.-]+\.(step|stp)$/i)
    .default("SlotCrate.step"),
  suitcaseVariantId: z.string().min(1).max(32).regex(/^[a-z0-9-]+$/).default("sc-124-v2"),
  settingsVersion: z.number().int().min(1).default(1),
  stlTessellationLinearMm,
  stlTessellationAngularRad
});

export type PlateRequest = z.infer<typeof plateRequestSchema>;

export const layoutBoxSchema = z.object({
  id: z.string().uuid(),
  x: z.number().int().min(0).max(SYSTEM.gridColumns - 1),
  y: z.number().int().min(0).max(SYSTEM.gridRows - 1),
  widthCells: cells,
  depthCells: cells,
  heightMm: heightMm.default(SYSTEM.defaultBoxHeightMm),
  dividers,
  pockets,
  pocketsFillOuter: z.boolean().default(false),
  waveInserts
});

export type LayoutBox = z.infer<typeof layoutBoxSchema>;

export const layoutRequestSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  geometryVersion: z.literal(SYSTEM.geometryVersion).default(SYSTEM.geometryVersion),
  settingsVersion: z.number().int().min(1).default(1),
  suitcaseVariantId: z.string().min(1).max(32).regex(/^[a-z0-9-]+$/).default("sc-124-v2"),
  plateStepFile: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_.-]+\.(step|stp)$/i)
    .default("SlotCrate.step"),
  gridPitchMm,
  wallThicknessMm,
  innerFloorRadiusMm,
  outerClearanceMm,
  stlTessellationLinearMm,
  stlTessellationAngularRad,
  grid: z
    .object({
      columns: z.literal(SYSTEM.gridColumns).default(SYSTEM.gridColumns),
      rows: z.literal(SYSTEM.gridRows).default(SYSTEM.gridRows),
      pitch: gridPitchMm
    })
    .default({
      columns: SYSTEM.gridColumns,
      rows: SYSTEM.gridRows,
      pitch: SYSTEM.gridPitchMm
    }),
  boxes: z.array(layoutBoxSchema)
}).refine((value) => Math.abs(value.grid.pitch - value.gridPitchMm) < 1e-6, {
  message: "grid.pitch must match gridPitchMm",
  path: ["grid", "pitch"]
});

export type LayoutRequest = z.infer<typeof layoutRequestSchema>;

export const inlayCutoutSchema = z.object({
  id: z.string().optional(),
  diameterMm: z
    .number()
    .min(SYSTEM.inlayMinCutoutDiameterMm)
    .max(SYSTEM.inlayMaxCutoutDiameterMm),
  centerXMm: z.number().min(0).max(SYSTEM.inlayWidthMm),
  centerYMm: z.number().min(0).max(SYSTEM.inlayDepthMm)
});

export type InlayCutout = z.infer<typeof inlayCutoutSchema>;

export const DEFAULT_INLAY_LEVEL1_CUTOUTS: InlayCutout[] = [
  { diameterMm: 41.0, centerXMm: 28.7, centerYMm: 30.0 },
  { diameterMm: 41.0, centerXMm: 28.7, centerYMm: 76.0 },
  { diameterMm: 41.0, centerXMm: 28.7, centerYMm: 122.0 },
  { diameterMm: 41.0, centerXMm: 28.7, centerYMm: 168.0 }
];

export const DEFAULT_INLAY_LEVEL2_CUTOUTS: InlayCutout[] = [
  { diameterMm: 25.0, centerXMm: 23.7, centerYMm: 28.7 },
  { diameterMm: 25.0, centerXMm: 33.7, centerYMm: 56.7 },
  { diameterMm: 25.0, centerXMm: 23.7, centerYMm: 84.7 },
  { diameterMm: 32.0, centerXMm: 28.7, centerYMm: 119.7 },
  { diameterMm: 32.0, centerXMm: 28.7, centerYMm: 154.7 },
  { diameterMm: 32.0, centerXMm: 28.7, centerYMm: 189.7 }
];

export const inlayRequestSchema = z
  .object({
    suitcaseVariantId: z.string().min(1).max(32).regex(/^[a-z0-9-]+$/).default("sc-124-v2"),
    settingsVersion: z.number().int().min(1).default(1),
    stlTessellationLinearMm: z.number().min(0.005).max(0.5).default(0.05),
    stlTessellationAngularRad: z.number().min(0.05).max(1.0).default(0.5),
    level1Cutouts: z.array(inlayCutoutSchema).max(SYSTEM.inlayMaxCutoutsPerLevel).default([]),
    level2Cutouts: z.array(inlayCutoutSchema).max(SYSTEM.inlayMaxCutoutsPerLevel).default([])
  })
  .refine(
    (data) => {
      // Validate Level 1 (X=[3.7, 53.7], Y=[4.5, 224.6], maxDia=42.0)
      const minX1 = SYSTEM.inlayLevel1ShelfXMinMm + SYSTEM.inlayMinMarginMm;
      const maxX1 = SYSTEM.inlayLevel1ShelfXMaxMm - SYSTEM.inlayMinMarginMm;
      const minY1 = SYSTEM.inlayLevel1ShelfYMinMm + SYSTEM.inlayMinMarginMm;
      const maxY1 = SYSTEM.inlayLevel1ShelfYMaxMm - SYSTEM.inlayMinMarginMm;

      for (const c of data.level1Cutouts) {
        if (c.diameterMm > SYSTEM.inlayLevel1MaxCutoutDiameterMm + 1e-4) return false;
        const r = c.diameterMm / 2.0;
        if (c.centerXMm - r < minX1 - 1e-4 || c.centerXMm + r > maxX1 + 1e-4) return false;
        if (c.centerYMm - r < minY1 - 1e-4 || c.centerYMm + r > maxY1 + 1e-4) return false;
      }

      // Validate Level 2 (X=[8.0, 49.4], Y=[4.5, 221.7], maxDia=36.2)
      const minX2 = SYSTEM.inlayLevel2ShelfXMinMm + SYSTEM.inlayMinMarginMm;
      const maxX2 = SYSTEM.inlayLevel2ShelfXMaxMm - SYSTEM.inlayMinMarginMm;
      const minY2 = SYSTEM.inlayLevel2ShelfYMinMm + SYSTEM.inlayMinMarginMm;
      const maxY2 = SYSTEM.inlayLevel2ShelfYMaxMm - SYSTEM.inlayMinMarginMm;

      for (const c of data.level2Cutouts) {
        if (c.diameterMm > SYSTEM.inlayLevel2MaxCutoutDiameterMm + 1e-4) return false;
        const r = c.diameterMm / 2.0;
        if (c.centerXMm - r < minX2 - 1e-4 || c.centerXMm + r > maxX2 + 1e-4) return false;
        if (c.centerYMm - r < minY2 - 1e-4 || c.centerYMm + r > maxY2 + 1e-4) return false;
      }

      // Check minimum hole-to-hole spacing on Level 1 (>= 2.6 mm)
      for (let i = 0; i < data.level1Cutouts.length; i++) {
        for (let j = i + 1; j < data.level1Cutouts.length; j++) {
          const c1 = data.level1Cutouts[i]!;
          const c2 = data.level1Cutouts[j]!;
          const r1 = c1.diameterMm / 2.0;
          const r2 = c2.diameterMm / 2.0;
          const dist = Math.hypot(c1.centerXMm - c2.centerXMm, c1.centerYMm - c2.centerYMm);
          if (dist < r1 + r2 + SYSTEM.inlayMinHoleSpacingMm - 1e-4) return false;
        }
      }

      // Check minimum hole-to-hole spacing on Level 2 (>= 2.6 mm)
      for (let i = 0; i < data.level2Cutouts.length; i++) {
        for (let j = i + 1; j < data.level2Cutouts.length; j++) {
          const c1 = data.level2Cutouts[i]!;
          const c2 = data.level2Cutouts[j]!;
          const r1 = c1.diameterMm / 2.0;
          const r2 = c2.diameterMm / 2.0;
          const dist = Math.hypot(c1.centerXMm - c2.centerXMm, c1.centerYMm - c2.centerYMm);
          if (dist < r1 + r2 + SYSTEM.inlayMinHoleSpacingMm - 1e-4) return false;
        }
      }

      return true;
    },
    {
      message: `Aussparungen müssen die ebenenspezifischen Maximalgrößen, Randabstände und den Mindestabstand von ${SYSTEM.inlayMinHoleSpacingMm} mm zueinander einhalten`
    }
  );

export type InlayRequest = z.infer<typeof inlayRequestSchema>;

export const coverRequestSchema = z.object({
  coverVariantId: z.literal(SYSTEM.coverVariantId).default(SYSTEM.coverVariantId),
  text: z.string().min(1).max(SYSTEM.coverMaxTextLength).refine(
    (value) => value === value.trim() && [...value].every((character) => character >= " " && character !== "\u007f"),
    "Text darf keine äußeren Leerzeichen oder Steuerzeichen enthalten"
  ),
  fontName: z.enum(SYSTEM.coverFonts.map((font) => font.value) as [string, ...string[]]).default(SYSTEM.coverFonts[0].value),
  fontSizeMm: z.number().min(SYSTEM.coverMinFontSizeMm).max(SYSTEM.coverMaxFontSizeMm).default(18),
  centerXMm: z.number().min(SYSTEM.coverEdgeMarginMm).max(SYSTEM.coverWidthMm - SYSTEM.coverEdgeMarginMm).default(SYSTEM.coverWidthMm / 2),
  centerYMm: z.number().min(SYSTEM.coverEdgeMarginMm).max(SYSTEM.coverDepthMm - SYSTEM.coverEdgeMarginMm).default(SYSTEM.coverDepthMm / 2),
  rotationDeg: z.number().min(-180).max(180).default(0),
  settingsVersion: z.number().int().min(1).default(1),
  stlTessellationLinearMm,
  stlTessellationAngularRad
});

export type CoverRequest = z.infer<typeof coverRequestSchema>;

