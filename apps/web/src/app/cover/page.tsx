import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getActiveSettings } from "@/lib/settings-service";
import { SYSTEM } from "@/lib/system";
import { CoverGeneratorClient } from "./CoverGeneratorClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cover");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: { canonical: "/cover" }
  };
}

export default async function CoverPage() {
  let variants: Awaited<ReturnType<typeof getActiveSettings>>["payload"]["suitcaseVariants"] = [];
  try {
    variants = (await getActiveSettings()).payload.suitcaseVariants;
  } catch {
    // Fallback keeps the supported reference variant available during startup.
  }
  return <CoverGeneratorClient suitcaseVariants={variants} supportedVariantId={SYSTEM.coverVariantId} />;
}
