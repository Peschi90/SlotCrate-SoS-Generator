import { z } from "zod";
import { SYSTEM } from "./system";

const cells = z.number().int().min(SYSTEM.minCells).max(SYSTEM.maxCells);
const heightMm = z.number().min(SYSTEM.minHeightMm).max(SYSTEM.maxHeightMm);
const scaleFactor = z.number().min(0.7).max(1.5).default(1);

export const boxRequestSchema = z.object({
  widthCells: cells,
  depthCells: cells,
  heightMm: heightMm.default(SYSTEM.defaultBoxHeightMm),
  settingsVersion: z.number().int().min(1).default(1),
  scaleFactor
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
  scaleFactor,
  grid: z
    .object({
      columns: z.literal(SYSTEM.gridColumns).default(SYSTEM.gridColumns),
      rows: z.literal(SYSTEM.gridRows).default(SYSTEM.gridRows),
      pitch: z.literal(SYSTEM.gridPitchMm).default(SYSTEM.gridPitchMm)
    })
    .default({
      columns: SYSTEM.gridColumns,
      rows: SYSTEM.gridRows,
      pitch: SYSTEM.gridPitchMm
    }),
  boxes: z.array(layoutBoxSchema)
});

export type LayoutRequest = z.infer<typeof layoutRequestSchema>;
