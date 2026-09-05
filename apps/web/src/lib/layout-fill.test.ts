import { describe, expect, it } from "vitest";
import { analyzeFreeCells, planFillLargest, planFillWithSize } from "./layout-fill";
import { SYSTEM } from "./system";

describe("planFillWithSize", () => {
  it("fills empty grid with 1x1 exactly gridCols*gridRows times", () => {
    const plan = planFillWithSize([], 1, 1);
    expect(plan).toHaveLength(SYSTEM.gridColumns * SYSTEM.gridRows);
  });

  it("fills empty 10x10 with 2x2 in 25 tiles", () => {
    const plan = planFillWithSize([], 2, 2);
    expect(plan).toHaveLength(25);
  });

  it("skips occupied cells", () => {
    const plan = planFillWithSize(
      [{ x: 0, y: 0, widthCells: 2, depthCells: 2 }],
      1,
      1
    );
    expect(plan).toHaveLength(SYSTEM.gridColumns * SYSTEM.gridRows - 4);
    expect(plan.every((p) => !(p.x < 2 && p.y < 2))).toBe(true);
  });

  it("respects variant limits", () => {
    const plan = planFillWithSize([], 4, 4, { maxWidthCells: 2, maxDepthCells: 2 });
    // Effektive Größe 2x2 → 25 Kacheln.
    expect(plan).toHaveLength(25);
    expect(plan[0]?.widthCells).toBe(2);
    expect(plan[0]?.depthCells).toBe(2);
  });
});

describe("planFillLargest", () => {
  it("uses one big box when grid is empty", () => {
    const plan = planFillLargest([]);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ x: 0, y: 0, widthCells: 10, depthCells: 10 });
  });

  it("splits around an obstacle without overlaps", () => {
    const plan = planFillLargest([{ x: 4, y: 4, widthCells: 2, depthCells: 2 }]);
    const totalCells = plan.reduce((acc, p) => acc + p.widthCells * p.depthCells, 0);
    expect(totalCells).toBe(SYSTEM.gridColumns * SYSTEM.gridRows - 4);
  });

  it("prefers requested size when it fits", () => {
    const plan = planFillLargest([], undefined, { widthCells: 2, depthCells: 2 });
    // 10x10 in 25 x 2x2-Kacheln.
    expect(plan).toHaveLength(25);
    expect(plan.every((p) => p.widthCells === 2 && p.depthCells === 2)).toBe(true);
  });

  it("respects variant limits", () => {
    const plan = planFillLargest([], { maxWidthCells: 3, maxDepthCells: 3 });
    expect(plan.every((p) => p.widthCells <= 3 && p.depthCells <= 3)).toBe(true);
    const totalCells = plan.reduce((acc, p) => acc + p.widthCells * p.depthCells, 0);
    expect(totalCells).toBe(SYSTEM.gridColumns * SYSTEM.gridRows);
  });
});

describe("analyzeFreeCells", () => {
  it("reports full grid as free when nothing is placed", () => {
    const report = analyzeFreeCells([]);
    expect(report.freeCells).toBe(SYSTEM.gridColumns * SYSTEM.gridRows);
    expect(report.regions).toHaveLength(1);
    expect(report.smallRegions).toBe(0);
  });

  it("detects a small isolated remainder", () => {
    // 10x10 minus einen 9x10-Block auf der linken Seite → Streifen von 1x10 rechts.
    const boxes = [{ x: 0, y: 0, widthCells: 9, depthCells: 10 }];
    const report = analyzeFreeCells(boxes);
    expect(report.freeCells).toBe(10);
    expect(report.regions).toHaveLength(1);
    expect(report.regions[0]?.cells).toBe(10);
    expect(report.smallRegions).toBe(0);
  });

  it("flags 1- and 2-cell islands as small regions", () => {
    // Zwei isolierte 1x1-Zellen bei (4,5) und (4,9).
    const boxes = [
      { x: 0, y: 0, widthCells: 10, depthCells: 5 },
      { x: 0, y: 5, widthCells: 4, depthCells: 5 },
      { x: 5, y: 5, widthCells: 5, depthCells: 5 },
      { x: 4, y: 6, widthCells: 1, depthCells: 3 }
    ];
    const report = analyzeFreeCells(boxes);
    expect(report.freeCells).toBe(2);
    expect(report.regions).toHaveLength(2);
    expect(report.smallRegions).toBe(2);
  });
});
