import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

export default function CoverPage() {
  return <CoverGeneratorClient />;
}
