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
  stlTessellationAngularRad
});

export type BoxRequest = z.infer<typeof boxRequestSchema>;

export const layoutBoxSchema = z.object({
  id: z.string().uuid(),
  x: z.number().int().min(0).max(SYSTEM.gridColumns - 1),
  y: z.number().int().min(0).max(SYSTEM.gridRows - 1),
  widthCells: cells,
  depthCells: cells,
  heightMm: heightMm.default(SYSTEM.defaultBoxHeightMm)
});

export type LayoutBox = z.infer<typeof layoutBoxSchema>;

export const layoutRequestSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  geometryVersion: z.literal(SYSTEM.geometryVersion).default(SYSTEM.geometryVersion),
  settingsVersion: z.number().int().min(1).default(1),
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
