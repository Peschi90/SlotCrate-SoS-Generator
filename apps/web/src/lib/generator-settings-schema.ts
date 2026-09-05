import { z } from "zod";

const suitcaseVariantSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[a-z0-9-]+$/),
    label: z.string().min(1).max(64),
    minCells: z.number().int().min(1).max(10).default(1),
    maxWidthCells: z.number().int().min(1).max(10),
    maxDepthCells: z.number().int().min(1).max(10),
    gridPitchMm: z.number().min(15).max(30).default(21.09),
    boxHeightMm: z.number().min(6).max(200).default(35.8),
    wallThicknessMm: z.number().min(0.6).max(4).default(1.2),
    innerFloorRadiusMm: z.number().min(0).max(4).default(2.5),
    outerClearanceMm: z.number().min(0).max(0.5).default(0),
    stlTessellationLinearMm: z.number().min(0.005).max(0.5).default(0.05),
    stlTessellationAngularRad: z.number().min(0.05).max(1.0).default(0.5),
    plateStepFile: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9_.-]+\.(step|stp)$/i, "nur Dateinamen mit .step/.stp erlaubt")
  })
  .strict();

const previewColorsSchema = z
  .object({
    plate: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    box: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    valid: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    invalid: z.string().regex(/^#[0-9a-fA-F]{6}$/)
  })
  .strict();

const currentGeneratorSettingsPayloadSchema = z
  .object({
    filenamePrefix: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_.-]+$/, "nur A-Z, a-z, 0-9, _-. erlaubt"),
    previewColors: previewColorsSchema.default({
      plate: "#e6e2d3",
      box: "#4c8cff",
      valid: "#3ea86a",
      invalid: "#e2483b"
    }),
    featureFlags: z.record(z.string(), z.boolean()).default({}),
    suitcaseVariants: z.array(suitcaseVariantSchema).min(1).max(12)
  })
  .strict()
  .refine(
    (v) =>
      v.suitcaseVariants.every(
        (variant) =>
          variant.minCells <= variant.maxWidthCells &&
          variant.minCells <= variant.maxDepthCells
      ),
    "Varianten muessen minCells <= maxWidthCells/maxDepthCells einhalten"
  )
  .refine(
    (v) => new Set(v.suitcaseVariants.map((variant) => variant.id)).size === v.suitcaseVariants.length,
    "Varianten-IDs muessen eindeutig sein"
  );

/**
 * Whitelist aller Admin-änderbaren Generator-Parameter mit harten
 * Ober- und Untergrenzen. Serverseitige Prüfung: wer diese Werte
 * schreibt, kann NICHT die Grundrasterplatte, die Rasterteilung,
 * die Bodenaufnahme oder die Grundausrichtung ändern (diese sind im
 * Geometrie-Code fest verankert).
 */
const legacyGeneratorSettingsPayloadSchema = z
  .object({
    boxHeightMm: z.number().min(6).max(200).optional(),
    wallThicknessMm: z.number().min(0.6).max(4).optional(),
    innerFloorRadiusMm: z.number().min(0).max(4).optional(),
    outerClearanceMm: z.number().min(0).max(0.5).optional(),
    minCells: z.number().int().min(1).max(10).optional(),
    maxCells: z.number().int().min(1).max(10).optional(),
    stlTessellationLinearMm: z.number().min(0.005).max(0.5).optional(),
    stlTessellationAngularRad: z.number().min(0.05).max(1.0).optional(),
    filenamePrefix: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_.-]+$/, "nur A-Z, a-z, 0-9, _-. erlaubt")
      .optional(),
    previewColors: previewColorsSchema.optional(),
    featureFlags: z.record(z.string(), z.boolean()).default({}),
    suitcaseVariants: z.array(suitcaseVariantSchema.partial()).max(12).optional()
  })
  .strict();

export type GeneratorSettingsPayload = z.infer<typeof currentGeneratorSettingsPayloadSchema>;

export const DEFAULT_GENERATOR_SETTINGS: GeneratorSettingsPayload = {
  filenamePrefix: "SlotCrate_Box",
  previewColors: {
    plate: "#e6e2d3",
    box: "#4c8cff",
    valid: "#3ea86a",
    invalid: "#e2483b"
  },
  featureFlags: {},
  suitcaseVariants: [
    {
      id: "sc-124-v2",
      label: "SC 124 V2",
      minCells: 1,
      maxWidthCells: 10,
      maxDepthCells: 10,
      gridPitchMm: 21.09,
      boxHeightMm: 35.8,
      wallThicknessMm: 1.2,
      innerFloorRadiusMm: 2.5,
      outerClearanceMm: 0,
      stlTessellationLinearMm: 0.05,
      stlTessellationAngularRad: 0.5,
      plateStepFile: "SlotCrate.step"
    }
  ]
};

export function parseGeneratorSettingsPayload(raw: unknown): GeneratorSettingsPayload {
  const legacy = legacyGeneratorSettingsPayloadSchema.parse(raw);
  const base = DEFAULT_GENERATOR_SETTINGS.suitcaseVariants[0]!;
  const legacyVariants = legacy.suitcaseVariants ?? [];
  const variants: Array<Partial<z.infer<typeof suitcaseVariantSchema>>> = legacyVariants.length > 0
    ? legacyVariants
    : [
        {
          id: "sc-124-v2",
          label: "SC 124 V2",
          minCells: legacy.minCells ?? base.minCells,
          maxWidthCells: legacy.maxCells ?? base.maxWidthCells,
          maxDepthCells: legacy.maxCells ?? base.maxDepthCells,
          gridPitchMm: base.gridPitchMm,
          boxHeightMm: legacy.boxHeightMm ?? base.boxHeightMm,
          wallThicknessMm: legacy.wallThicknessMm ?? base.wallThicknessMm,
          innerFloorRadiusMm: legacy.innerFloorRadiusMm ?? base.innerFloorRadiusMm,
          outerClearanceMm: legacy.outerClearanceMm ?? base.outerClearanceMm,
          stlTessellationLinearMm: legacy.stlTessellationLinearMm ?? base.stlTessellationLinearMm,
          stlTessellationAngularRad: legacy.stlTessellationAngularRad ?? base.stlTessellationAngularRad,
          plateStepFile: "SlotCrate.step"
        }
      ];

  const normalizedVariants = variants.map((variant, idx) => ({
    id: variant.id ?? `variant-${idx + 1}`,
    label: variant.label ?? `Variant ${idx + 1}`,
    minCells: variant.minCells ?? legacy.minCells ?? base.minCells,
    maxWidthCells: variant.maxWidthCells ?? legacy.maxCells ?? base.maxWidthCells,
    maxDepthCells: variant.maxDepthCells ?? legacy.maxCells ?? base.maxDepthCells,
    gridPitchMm: variant.gridPitchMm ?? base.gridPitchMm,
    boxHeightMm: variant.boxHeightMm ?? legacy.boxHeightMm ?? base.boxHeightMm,
    wallThicknessMm: variant.wallThicknessMm ?? legacy.wallThicknessMm ?? base.wallThicknessMm,
    innerFloorRadiusMm: variant.innerFloorRadiusMm ?? legacy.innerFloorRadiusMm ?? base.innerFloorRadiusMm,
    outerClearanceMm: variant.outerClearanceMm ?? legacy.outerClearanceMm ?? base.outerClearanceMm,
    stlTessellationLinearMm:
      variant.stlTessellationLinearMm ?? legacy.stlTessellationLinearMm ?? base.stlTessellationLinearMm,
    stlTessellationAngularRad:
      variant.stlTessellationAngularRad ?? legacy.stlTessellationAngularRad ?? base.stlTessellationAngularRad,
    plateStepFile: variant.plateStepFile ?? "SlotCrate.step"
  }));

  return currentGeneratorSettingsPayloadSchema.parse({
    filenamePrefix: legacy.filenamePrefix ?? DEFAULT_GENERATOR_SETTINGS.filenamePrefix,
    previewColors: legacy.previewColors ?? DEFAULT_GENERATOR_SETTINGS.previewColors,
    featureFlags: legacy.featureFlags ?? {},
    suitcaseVariants: normalizedVariants
  });
}

export const generatorSettingsPayloadSchema = currentGeneratorSettingsPayloadSchema;
