import { z } from "zod";

/**
 * Whitelist aller Admin-änderbaren Generator-Parameter mit harten
 * Ober- und Untergrenzen. Serverseitige Prüfung: wer diese Werte
 * schreibt, kann NICHT die Grundrasterplatte, die Rasterteilung,
 * die Bodenaufnahme oder die Grundausrichtung ändern (diese sind im
 * Geometrie-Code fest verankert).
 */
export const generatorSettingsPayloadSchema = z
  .object({
    boxHeightMm: z.number().min(6).max(200),
    wallThicknessMm: z.number().min(0.6).max(4),
    innerFloorRadiusMm: z.number().min(0).max(4),
    outerClearanceMm: z.number().min(0).max(0.5).default(0),
    minCells: z.number().int().min(1).max(10).default(1),
    maxCells: z.number().int().min(1).max(10).default(10),
    enabledSizes: z.array(z.tuple([z.number().int().min(1).max(10), z.number().int().min(1).max(10)])).default([]),
    stlTessellationLinearMm: z.number().min(0.005).max(0.5).default(0.05),
    stlTessellationAngularRad: z.number().min(0.05).max(1.0).default(0.5),
    filenamePrefix: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_.-]+$/, "nur A-Z, a-z, 0-9, _-. erlaubt"),
    previewColors: z
      .object({
        plate: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        box: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        valid: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        invalid: z.string().regex(/^#[0-9a-fA-F]{6}$/)
      })
      .default({
        plate: "#e6e2d3",
        box: "#4c8cff",
        valid: "#3ea86a",
        invalid: "#e2483b"
      }),
    featureFlags: z.record(z.string(), z.boolean()).default({})
  })
  .strict()
  .refine((v) => v.minCells <= v.maxCells, "minCells muss ≤ maxCells sein");

export type GeneratorSettingsPayload = z.infer<typeof generatorSettingsPayloadSchema>;

export const DEFAULT_GENERATOR_SETTINGS: GeneratorSettingsPayload = {
  boxHeightMm: 35.8,
  wallThicknessMm: 1.2,
  innerFloorRadiusMm: 2.5,
  outerClearanceMm: 0,
  minCells: 1,
  maxCells: 10,
  enabledSizes: [],
  stlTessellationLinearMm: 0.05,
  stlTessellationAngularRad: 0.5,
  filenamePrefix: "SlotCrate_Box",
  previewColors: {
    plate: "#e6e2d3",
    box: "#4c8cff",
    valid: "#3ea86a",
    invalid: "#e2483b"
  },
  featureFlags: {}
};
