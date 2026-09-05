import { describe, expect, it } from "vitest";
import { createDraft, LAYOUT_DRAFT_KIND, LAYOUT_DRAFT_SCHEMA_VERSION, parseLayoutDraftBestEffort } from "./layout-draft";
import { SYSTEM } from "./system";

const validDraft = createDraft({
  variantId: "sc-124-v2",
  selectedHeightMm: 35.8,
  boxes: [
    { x: 0, y: 0, widthCells: 2, depthCells: 2, heightMm: 35.8 },
    { x: 3, y: 3, widthCells: 1, depthCells: 1, heightMm: 35.8 }
  ]
});

describe("layout-draft parser", () => {
  it("round-trips a valid draft", () => {
    const result = parseLayoutDraftBestEffort(JSON.parse(JSON.stringify(validDraft)));
    expect(result.draft).not.toBeNull();
    expect(result.warnings).toEqual([]);
    expect(result.draft?.boxes).toHaveLength(2);
    expect(result.draft?.variantId).toBe("sc-124-v2");
  });

  it("warns on unknown kind but still loads", () => {
    const result = parseLayoutDraftBestEffort({ ...validDraft, kind: "other" });
    expect(result.draft).not.toBeNull();
    expect(result.warnings).toContain("DRAFT_UNKNOWN_KIND");
  });

  it("warns on schema version mismatch", () => {
    const result = parseLayoutDraftBestEffort({ ...validDraft, schemaVersion: 999 });
    expect(result.draft).not.toBeNull();
    expect(result.warnings).toContain("DRAFT_SCHEMA_MISMATCH");
    expect(result.draft?.schemaVersion).toBe(LAYOUT_DRAFT_SCHEMA_VERSION);
  });

  it("warns on geometry version mismatch", () => {
    const result = parseLayoutDraftBestEffort({ ...validDraft, geometryVersion: "old-v0" });
    expect(result.draft).not.toBeNull();
    expect(result.warnings).toContain("DRAFT_GEOMETRY_MISMATCH");
    expect(result.draft?.geometryVersion).toBe(SYSTEM.geometryVersion);
  });

  it("drops invalid boxes but keeps valid ones", () => {
    const result = parseLayoutDraftBestEffort({
      ...validDraft,
      boxes: [
        validDraft.boxes[0],
        { x: -1, y: 0, widthCells: 1, depthCells: 1, heightMm: 30 },
        { x: 5, y: 5, widthCells: 99, depthCells: 1, heightMm: 30 }
      ]
    });
    expect(result.draft?.boxes).toHaveLength(1);
    expect(result.warnings).toContain("DRAFT_BOX_DROPPED");
  });

  it("returns null for non-objects", () => {
    expect(parseLayoutDraftBestEffort(null).draft).toBeNull();
    expect(parseLayoutDraftBestEffort("string").draft).toBeNull();
    expect(parseLayoutDraftBestEffort([1, 2, 3]).draft).toBeNull();
  });

  it("returns null when every box is invalid", () => {
    const result = parseLayoutDraftBestEffort({
      ...validDraft,
      boxes: [{ x: -5, y: -5, widthCells: 0, depthCells: 0, heightMm: -1 }]
    });
    expect(result.draft).toBeNull();
    expect(result.warnings).toContain("DRAFT_BOX_DROPPED");
  });

  it("clamps out-of-range heights", () => {
    const result = parseLayoutDraftBestEffort({ ...validDraft, selectedHeightMm: 9999 });
    expect(result.draft?.selectedHeightMm).toBe(SYSTEM.maxHeightMm);
  });

  it("keeps kind literal on serialization", () => {
    expect(validDraft.kind).toBe(LAYOUT_DRAFT_KIND);
  });
});
