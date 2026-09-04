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
      id: "classic",
      label: "Classic",
      maxWidthCells: SYSTEM.maxCells,
      maxDepthCells: SYSTEM.maxCells,
      scaleFactor: 1,
      defaultHeightMm: SYSTEM.defaultBoxHeightMm
    }
  ];

  return <PlannerClient variants={variants} defaultHeightMm={settings?.payload.boxHeightMm ?? SYSTEM.defaultBoxHeightMm} />;
}
