import { z } from "zod";
import { SYSTEM } from "./system";

/**
 * Portables JSON-Format für gespeicherte / geteilte Layouts.
 * Enthält bewusst KEINE Kasten-IDs — die werden beim Laden neu generiert,
 * damit ID-Kollisionen zwischen Sitzungen ausgeschlossen sind.
 */
export const LAYOUT_DRAFT_SCHEMA_VERSION = 1 as const;
export const LAYOUT_DRAFT_KIND = "slotcrate.layout" as const;

const cells = z.number().int().min(SYSTEM.minCells).max(SYSTEM.maxCells);
const heightMm = z.number().min(SYSTEM.minHeightMm).max(SYSTEM.maxHeightMm);

export const layoutDraftBoxSchema = z.object({
  x: z.number().int().min(0).max(SYSTEM.gridColumns - 1),
  y: z.number().int().min(0).max(SYSTEM.gridRows - 1),
  widthCells: cells,
  depthCells: cells,
  heightMm
});

export type LayoutDraftBox = z.infer<typeof layoutDraftBoxSchema>;

export const layoutDraftSchema = z.object({
  kind: z.literal(LAYOUT_DRAFT_KIND),
  schemaVersion: z.literal(LAYOUT_DRAFT_SCHEMA_VERSION),
  geometryVersion: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/i),
  selectedHeightMm: heightMm,
  boxes: z.array(layoutDraftBoxSchema).max(200)
});

export type LayoutDraft = z.infer<typeof layoutDraftSchema>;

/** Stabile Warnungscodes (i18n im Frontend). */
export type LayoutDraftWarning =
  | "DRAFT_UNKNOWN_KIND"
  | "DRAFT_SCHEMA_MISMATCH"
  | "DRAFT_GEOMETRY_MISMATCH"
  | "DRAFT_VARIANT_UNKNOWN"
  | "DRAFT_BOX_DROPPED"
  | "DRAFT_BOX_OVERLAP";

export interface ParseLayoutDraftResult {
  draft: LayoutDraft | null;
  warnings: LayoutDraftWarning[];
}

function pushUnique(list: LayoutDraftWarning[], code: LayoutDraftWarning): void {
  if (!list.includes(code)) list.push(code);
}

/**
 * Best-Effort-Parser: nimmt beliebige unbekannte JSON-Werte entgegen,
 * repariert soweit möglich, ignoriert ungültige Kästen und sammelt
 * stabile Warnungscodes für den UI-Layer.
 */
export function parseLayoutDraftBestEffort(input: unknown): ParseLayoutDraftResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { draft: null, warnings: [] };
  }
  const obj = input as Record<string, unknown>;
  const warnings: LayoutDraftWarning[] = [];

  if (obj.kind !== LAYOUT_DRAFT_KIND) {
    pushUnique(warnings, "DRAFT_UNKNOWN_KIND");
  }

  const rawSchemaVersion = typeof obj.schemaVersion === "number" ? obj.schemaVersion : null;
  if (rawSchemaVersion !== null && rawSchemaVersion !== LAYOUT_DRAFT_SCHEMA_VERSION) {
    pushUnique(warnings, "DRAFT_SCHEMA_MISMATCH");
  }

  const rawGeometryVersion = typeof obj.geometryVersion === "string" ? obj.geometryVersion : null;
  if (rawGeometryVersion !== null && rawGeometryVersion !== SYSTEM.geometryVersion) {
    pushUnique(warnings, "DRAFT_GEOMETRY_MISMATCH");
  }

  const variantId =
    typeof obj.variantId === "string" && /^[a-z0-9-]+$/i.test(obj.variantId) && obj.variantId.length <= 64
      ? obj.variantId
      : "sc-124-v2";

  const rawHeight = typeof obj.selectedHeightMm === "number" ? obj.selectedHeightMm : SYSTEM.defaultBoxHeightMm;
  const selectedHeightMm = Math.min(
    SYSTEM.maxHeightMm,
    Math.max(SYSTEM.minHeightMm, rawHeight)
  );

  const rawBoxes = Array.isArray(obj.boxes) ? obj.boxes : [];
  const boxes: LayoutDraftBox[] = [];
  for (const raw of rawBoxes.slice(0, 200)) {
    const parsed = layoutDraftBoxSchema.safeParse(raw);
    if (parsed.success) {
      boxes.push(parsed.data);
    } else {
      pushUnique(warnings, "DRAFT_BOX_DROPPED");
    }
  }
  if (boxes.length === 0 && rawBoxes.length > 0) {
    // alle Kästen ungültig → kein sinnvoller Entwurf
    return { draft: null, warnings };
  }

  return {
    draft: {
      kind: LAYOUT_DRAFT_KIND,
      schemaVersion: LAYOUT_DRAFT_SCHEMA_VERSION,
      geometryVersion: SYSTEM.geometryVersion,
      variantId,
      selectedHeightMm,
      boxes
    },
    warnings
  };
}

/** Erzeugt einen neuen Entwurf aus dem aktuellen Store-State. */
export function createDraft(input: {
  variantId: string;
  selectedHeightMm: number;
  boxes: Array<{ x: number; y: number; widthCells: number; depthCells: number; heightMm: number }>;
}): LayoutDraft {
  return {
    kind: LAYOUT_DRAFT_KIND,
    schemaVersion: LAYOUT_DRAFT_SCHEMA_VERSION,
    geometryVersion: SYSTEM.geometryVersion,
    variantId: input.variantId,
    selectedHeightMm: input.selectedHeightMm,
    boxes: input.boxes.map((b) => ({
      x: b.x,
      y: b.y,
      widthCells: b.widthCells,
      depthCells: b.depthCells,
      heightMm: b.heightMm
    }))
  };
}
