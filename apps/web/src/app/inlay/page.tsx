import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

export default function InlayPage() {
  return <InlayGeneratorClient />;
}
