import { describe, expect, it } from "vitest";
import { calculateInlayPlacement } from "./inlay-auto-placement";

describe("calculateInlayPlacement", () => {
  it("handles empty demand", () => {
    const res = calculateInlayPlacement([]);
    expect(res.fitsAll).toBe(true);
    expect(res.cutouts).toHaveLength(0);
    expect(res.occupancyPercent).toBe(0);
  });

  it("places 4x 36mm bottles fitting in shelf length", () => {
    const res = calculateInlayPlacement([
      { id: "1", diameterMm: 36, count: 4 }
    ]);
    expect(res.fitsAll).toBe(true);
    expect(res.cutouts).toHaveLength(4);
    expect(res.unplacedCount).toBe(0);
    // All 36mm bottles must be centered at 28.7mm
    expect(res.cutouts.every((c) => c.centerXMm === 28.7)).toBe(true);
    expect(res.cutouts[3]!.centerYMm + 18).toBeLessThanOrEqual(215.4);
  });

  it("detects when bottles exceed available shelf length", () => {
    // 7x 36mm bottles cannot fit in 207mm
    const res = calculateInlayPlacement([
      { id: "1", diameterMm: 36, count: 7 }
    ]);
    expect(res.fitsAll).toBe(false);
    expect(res.unplacedCount).toBeGreaterThan(0);
    expect(res.cutouts.length).toBeLessThan(7);
  });

  it("places smaller vials in staggered zigzag configuration", () => {
    const res = calculateInlayPlacement([
      { id: "1", diameterMm: 25, count: 8 }
    ]);
    expect(res.fitsAll).toBe(true);
    expect(res.cutouts).toHaveLength(8);
    // Check alternating X positions
    expect(res.cutouts[0]!.centerXMm).not.toBe(res.cutouts[1]!.centerXMm);
  });

  it("supports append mode with existing cutouts", () => {
    const existing = [
      { diameterMm: 36, centerXMm: 28.7, centerYMm: 30 }
    ];
    const res = calculateInlayPlacement(
      [{ id: "1", diameterMm: 25, count: 2 }],
      existing,
      "append"
    );
    expect(res.fitsAll).toBe(true);
    expect(res.cutouts).toHaveLength(3);
    expect(res.cutouts[0]).toEqual(existing[0]);
  });
});
