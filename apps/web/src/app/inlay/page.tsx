import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getActiveSettings } from "@/lib/settings-service";
import { InlayGeneratorClient } from "./InlayGeneratorClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("inlay.meta.title"),
    description: t("inlay.meta.description"),
    alternates: {
      canonical: "/inlay"
    }
  };
}

export default async function InlayPage() {
  let settings: Awaited<ReturnType<typeof getActiveSettings>> | null = null;
  try {
    settings = await getActiveSettings();
  } catch {
    // Server nicht erreichbar → Fallback auf clientseitige Defaults.
  }
  return <InlayGeneratorClient suitcaseVariants={settings?.payload.suitcaseVariants} />;
}
