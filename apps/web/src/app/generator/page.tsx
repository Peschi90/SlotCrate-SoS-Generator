import { fetchActiveSettings } from "@/lib/cad-client";
import { SYSTEM } from "@/lib/system";
import { GeneratorClient } from "./GeneratorClient";

export const dynamic = "force-dynamic";

export default async function GeneratorPage() {
  let settings: Awaited<ReturnType<typeof fetchActiveSettings>> | null = null;
  try {
    settings = await fetchActiveSettings();
  } catch {
    // Server nicht erreichbar → Fallback auf clientseitige Defaults.
  }
  return (
    <GeneratorClient
      defaultHeightMm={settings?.box.defaultHeightMm ?? SYSTEM.defaultBoxHeightMm}
      minHeightMm={settings?.limits.minHeightMm ?? SYSTEM.minHeightMm}
      maxHeightMm={settings?.limits.maxHeightMm ?? SYSTEM.maxHeightMm}
      filenamePrefix={settings?.filenamePrefix ?? "SlotCrate_Box"}
    />
  );
}
