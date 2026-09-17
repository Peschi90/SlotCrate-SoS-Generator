import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getActiveSettings } from "@/lib/settings-service";
import { SYSTEM } from "@/lib/system";
import { GeneratorTestClient } from "./GeneratorTestClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("generatorTest");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false }
  };
}

export default async function GeneratorTestPage() {
  let settings: Awaited<ReturnType<typeof getActiveSettings>> | null = null;
  try {
    settings = await getActiveSettings();
  } catch {
    // The test page remains usable with the established system defaults.
  }

  return (
    <GeneratorTestClient
      defaultHeightMm={settings?.payload.suitcaseVariants[0]?.boxHeightMm ?? SYSTEM.defaultBoxHeightMm}
      minHeightMm={SYSTEM.minHeightMm}
      maxHeightMm={SYSTEM.maxHeightMm}
      suitcaseVariants={settings?.payload.suitcaseVariants}
      filenamePrefix={settings?.payload.filenamePrefix ?? "SlotCrate_Box"}
    />
  );
}