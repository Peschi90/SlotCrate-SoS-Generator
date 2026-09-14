import { describe, expect, it } from "vitest";
import { boxRequestSchema, inlayRequestSchema, layoutRequestSchema } from "@/lib/schema";

describe("boxRequestSchema", () => {
  it("accepts valid input", () => {
    const r = boxRequestSchema.parse({ widthCells: 2, depthCells: 3 });
    expect(r.heightMm).toBe(35.8);
    expect(r.settingsVersion).toBe(1);
    expect(r.dividers).toEqual([]);
  });
  it("rejects out-of-range cells", () => {
    expect(() => boxRequestSchema.parse({ widthCells: 0, depthCells: 1 })).toThrow();
    expect(() => boxRequestSchema.parse({ widthCells: 1, depthCells: 11 })).toThrow();
  });
  it("rejects too small height", () => {
    expect(() => boxRequestSchema.parse({ widthCells: 1, depthCells: 1, heightMm: 3 })).toThrow();
  });
  it("accepts a valid divider", () => {
    const r = boxRequestSchema.parse({
      widthCells: 2,
      depthCells: 2,
      dividers: [{ axis: "x", offsetMm: 10, heightMm: 20 }]
    });
    expect(r.dividers).toHaveLength(1);
    expect(r.dividers[0]!.axis).toBe("x");
  });
  it("rejects unknown divider axis", () => {
    expect(() =>
      boxRequestSchema.parse({
        widthCells: 2,
        depthCells: 2,
        dividers: [{ axis: "z", offsetMm: 10, heightMm: 20 }]
      })
    ).toThrow();
  });
  it("rejects divider height below minimum", () => {
    expect(() =>
      boxRequestSchema.parse({
        widthCells: 2,
        depthCells: 2,
        dividers: [{ axis: "x", offsetMm: 10, heightMm: 0.1 }]
      })
    ).toThrow();
  });
  it("accepts a valid pocket", () => {
    const r = boxRequestSchema.parse({
      widthCells: 3,
      depthCells: 3,
      pockets: [{ centerXMm: 15, centerYMm: 15, diameterMm: 12, heightMm: 20 }]
    });
    expect(r.pockets).toHaveLength(1);
    expect(r.pockets[0]!.diameterMm).toBe(12);
  });
  it("rejects pocket diameter below minimum", () => {
    expect(() =>
      boxRequestSchema.parse({
        widthCells: 3,
        depthCells: 3,
        pockets: [{ centerXMm: 15, centerYMm: 15, diameterMm: 1, heightMm: 10 }]
      })
    ).toThrow();
  });
  it("accepts pocketsFillOuter flag", () => {
    const r = boxRequestSchema.parse({
      widthCells: 3,
      depthCells: 3,
      pocketsFillOuter: true
    });
    expect(r.pocketsFillOuter).toBe(true);
  });
  it("defaults pocketsFillOuter to false", () => {
    const r = boxRequestSchema.parse({ widthCells: 2, depthCells: 2 });
    expect(r.pocketsFillOuter).toBe(false);
  });
  it("accepts a valid wave insert", () => {
    const r = boxRequestSchema.parse({
      widthCells: 3,
      depthCells: 3,
      waveInserts: [
        {
          axis: "x",
          offsetMm: 15,
          heightMm: 20,
          grooveDiameterMm: 10,
          grooveCount: 2,
          grooveDepthMm: 3
        }
      ]
    });
    expect(r.waveInserts).toHaveLength(1);
    expect(r.waveInserts[0]!.grooveCount).toBe(2);
  });
  it("defaults waveInserts to empty array", () => {
    const r = boxRequestSchema.parse({ widthCells: 2, depthCells: 2 });
    expect(r.waveInserts).toEqual([]);
  });
  it("rejects wave insert groove diameter below minimum", () => {
    expect(() =>
      boxRequestSchema.parse({
        widthCells: 3,
        depthCells: 3,
        waveInserts: [
          {
            axis: "x",
            offsetMm: 15,
            heightMm: 20,
            grooveDiameterMm: 1,
            grooveCount: 1,
            grooveDepthMm: 0.5
          }
        ]
      })
    ).toThrow();
  });
  it("rejects unknown wave insert axis", () => {
    expect(() =>
      boxRequestSchema.parse({
        widthCells: 3,
        depthCells: 3,
        waveInserts: [
          {
            axis: "z",
            offsetMm: 15,
            heightMm: 20,
            grooveDiameterMm: 10,
            grooveCount: 1,
            grooveDepthMm: 3
          }
        ]
      })
    ).toThrow();
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

describe("inlayRequestSchema", () => {
  it("accepts valid empty or populated cutout lists", () => {
    const res = inlayRequestSchema.parse({
      level1Cutouts: [{ diameterMm: 25, centerXMm: 28.7, centerYMm: 30 }],
      level2Cutouts: [{ diameterMm: 32, centerXMm: 28.7, centerYMm: 60 }]
    });
    expect(res.level1Cutouts).toHaveLength(1);
    expect(res.level2Cutouts).toHaveLength(1);
    expect(res.settingsVersion).toBe(1);
  });

  it("rejects cutout diameter out of bounds", () => {
    expect(() =>
      inlayRequestSchema.parse({
        level1Cutouts: [{ diameterMm: 2, centerXMm: 28.7, centerYMm: 30 }]
      })
    ).toThrow();
    expect(() =>
      inlayRequestSchema.parse({
        level1Cutouts: [{ diameterMm: 60, centerXMm: 28.7, centerYMm: 30 }]
      })
    ).toThrow();
  });
});
