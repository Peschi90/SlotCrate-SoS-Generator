import { describe, expect, it } from "vitest";
import { calculateDualLevelPlacement } from "./inlay-auto-placement";

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

  it("detects when total bottles exceed combined capacity of both levels", () => {
    const res = calculateDualLevelPlacement([
      { id: "1", diameterMm: 42, count: 6 }, // L1 fits max ~4
      { id: "2", diameterMm: 36, count: 6 }  // L2 fits max ~4
    ]);
    expect(res.fitsAll).toBe(false);
    expect(res.unplacedCount).toBeGreaterThan(0);
  });
});
