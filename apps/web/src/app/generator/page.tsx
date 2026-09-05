import { getActiveSettings } from "@/lib/settings-service";
import { SYSTEM } from "@/lib/system";
import { GeneratorClient } from "./GeneratorClient";

export const dynamic = "force-dynamic";

export default async function GeneratorPage() {
  let settings: Awaited<ReturnType<typeof getActiveSettings>> | null = null;
  try {
    settings = await getActiveSettings();
  } catch {
    // Server nicht erreichbar → Fallback auf clientseitige Defaults.
  }
  return (
    <GeneratorClient
      defaultHeightMm={settings?.payload.suitcaseVariants[0]?.boxHeightMm ?? SYSTEM.defaultBoxHeightMm}
      minHeightMm={SYSTEM.minHeightMm}
      maxHeightMm={SYSTEM.maxHeightMm}
      suitcaseVariants={settings?.payload.suitcaseVariants}
      filenamePrefix={settings?.payload.filenamePrefix ?? "SlotCrate_Box"}
    />
  );
}
