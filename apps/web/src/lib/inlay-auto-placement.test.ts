import { describe, expect, it } from "vitest";
import { calculateDualLevelPlacement } from "./inlay-auto-placement";
import { inlayRequestSchema } from "./schema";

describe("calculateDualLevelPlacement", () => {
  it("handles empty demand", () => {
    const res = calculateDualLevelPlacement([]);
    expect(res.fitsAll).toBe(true);
    expect(res.level1Cutouts).toHaveLength(0);
    expect(res.level2Cutouts).toHaveLength(0);
    expect(res.occupancyPercent).toBe(0);
  });

  it("places large 42mm and 41mm bottles on Level 1 only", () => {
    const res = calculateDualLevelPlacement([
      { id: "1", diameterMm: 42, count: 2 },
      { id: "2", diameterMm: 32, count: 4 }
    ]);
    expect(res.fitsAll).toBe(true);
    expect(res.level1Cutouts.some((c) => c.diameterMm === 42)).toBe(true);
    // Level 2 must never contain cutouts > 36.2 mm
    expect(res.level2Cutouts.every((c) => c.diameterMm <= 36.2)).toBe(true);
  });

  it("distributes demand across both Level 1 and Level 2", () => {
    // 4x 36mm bottles (goes to L1) + 5x 32mm bottles (goes to L2)
    const res = calculateDualLevelPlacement([
      { id: "1", diameterMm: 36, count: 4 },
      { id: "2", diameterMm: 32, count: 5 }
    ]);
    expect(res.fitsAll).toBe(true);
    expect(res.level1Cutouts.length).toBeGreaterThan(0);
    expect(res.level2Cutouts.length).toBeGreaterThan(0);
    expect(res.placedCount).toBe(9);
  });

  it("strictly preserves minimum 2.6mm hole-to-hole and edge clearances in schema", () => {
    const res = calculateDualLevelPlacement([
      { id: "1", diameterMm: 41, count: 2 },
      { id: "2", diameterMm: 32, count: 3 },
      { id: "3", diameterMm: 25, count: 5 }
    ]);
    expect(res.placedCount).toBeGreaterThan(0);

    // Verify against inlayRequestSchema refinement validator
    expect(() =>
      inlayRequestSchema.parse({
        suitcaseVariantId: "sc-124-v2",
        level1Cutouts: res.level1Cutouts,
        level2Cutouts: res.level2Cutouts
      })
    ).not.toThrow();

    // Verify pairwise distances on Level 1
    for (let i = 0; i < res.level1Cutouts.length; i++) {
      for (let j = i + 1; j < res.level1Cutouts.length; j++) {
        const c1 = res.level1Cutouts[i]!;
        const c2 = res.level1Cutouts[j]!;
        const dist = Math.hypot(c1.centerXMm - c2.centerXMm, c1.centerYMm - c2.centerYMm);
        const minReq = c1.diameterMm / 2 + c2.diameterMm / 2 + 2.6;
        expect(dist).toBeGreaterThanOrEqual(minReq - 1e-4);
      }
    }

    // Verify pairwise distances on Level 2
    for (let i = 0; i < res.level2Cutouts.length; i++) {
      for (let j = i + 1; j < res.level2Cutouts.length; j++) {
        const c1 = res.level2Cutouts[i]!;
        const c2 = res.level2Cutouts[j]!;
        const dist = Math.hypot(c1.centerXMm - c2.centerXMm, c1.centerYMm - c2.centerYMm);
        const minReq = c1.diameterMm / 2 + c2.diameterMm / 2 + 2.6;
        expect(dist).toBeGreaterThanOrEqual(minReq - 1e-4);
      }
    }
  });

  it("detects when total bottles exceed combined capacity of both levels", () => {
    const res = calculateDualLevelPlacement([
      { id: "1", diameterMm: 42, count: 6 }, // L1 fits max ~4
      { id: "2", diameterMm: 36, count: 6 }  // L2 fits max ~4
    ]);
    expect(res.fitsAll).toBe(false);
    expect(res.unplacedCount).toBeGreaterThan(0);
  });
});
