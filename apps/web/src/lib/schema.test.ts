import { describe, expect, it } from "vitest";
import { boxRequestSchema, layoutRequestSchema } from "@/lib/schema";

describe("boxRequestSchema", () => {
  it("accepts valid input", () => {
    const r = boxRequestSchema.parse({ widthCells: 2, depthCells: 3 });
    expect(r.heightMm).toBe(35.8);
    expect(r.settingsVersion).toBe(1);
  });
  it("rejects out-of-range cells", () => {
    expect(() => boxRequestSchema.parse({ widthCells: 0, depthCells: 1 })).toThrow();
    expect(() => boxRequestSchema.parse({ widthCells: 1, depthCells: 11 })).toThrow();
  });
  it("rejects too small height", () => {
    expect(() => boxRequestSchema.parse({ widthCells: 1, depthCells: 1, heightMm: 3 })).toThrow();
  });
});

describe("layoutRequestSchema", () => {
  it("accepts an empty layout with defaults", () => {
    const r = layoutRequestSchema.parse({ boxes: [] });
    expect(r.grid.columns).toBe(10);
    expect(r.grid.pitch).toBe(21.09);
    expect(r.geometryVersion).toBe("slotcrate-v1");
  });
  it("rejects pitch tampering", () => {
    expect(() =>
      layoutRequestSchema.parse({
        boxes: [],
        grid: { columns: 10, rows: 10, pitch: 20 }
      })
    ).toThrow();
  });
});
