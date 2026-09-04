import { getActiveSettings } from "@/lib/settings-service";
import { SYSTEM } from "@/lib/system";
import { PlannerClient } from "./PlannerClient";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  let settings: Awaited<ReturnType<typeof getActiveSettings>> | null = null;
  try {
    settings = await getActiveSettings();
  } catch {
    // Fallback auf lokale Defaults, falls DB nicht erreichbar ist.
  }

  const variants = settings?.payload.suitcaseVariants ?? [
    {
      id: "sc-124-v2",
      label: "SC 124 V2",
      minCells: SYSTEM.minCells,
      maxWidthCells: SYSTEM.maxCells,
      maxDepthCells: SYSTEM.maxCells,
      gridPitchMm: SYSTEM.gridPitchMm,
      boxHeightMm: SYSTEM.defaultBoxHeightMm,
      wallThicknessMm: SYSTEM.wallThicknessMm,
      innerFloorRadiusMm: 2.5,
      outerClearanceMm: 0,
      stlTessellationLinearMm: 0.05,
      stlTessellationAngularRad: 0.5
    }
  ];

  return <PlannerClient variants={variants} defaultHeightMm={settings?.payload.boxHeightMm ?? SYSTEM.defaultBoxHeightMm} />;
}
