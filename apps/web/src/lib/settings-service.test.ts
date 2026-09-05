import { describe, expect, it } from "vitest";
import { buildSettingsSnapshot } from "./settings-service";

describe("buildSettingsSnapshot", () => {
  it("returns null when no version row is available", () => {
    expect(buildSettingsSnapshot(null)).toBeNull();
  });

  it("parses a valid payload without crashing", () => {
    const snapshot = buildSettingsSnapshot({
      id: 42,
      createdAt: new Date("2026-01-01T12:00:00.000Z"),
      payload: {
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
      }
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.version).toBe(42);
    expect(snapshot?.payload.filenamePrefix).toBe("SlotCrate_Box");
  });
});
