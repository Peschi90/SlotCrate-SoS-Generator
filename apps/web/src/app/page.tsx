import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  alternates: {
    canonical: "/"
  }
};

export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const slotcrateHref = locale === "en" ? "https://slotcrate.i3ull3t.de/en/" : "https://slotcrate.i3ull3t.de/";
  return (
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
      <div className="max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-semibold mb-5 leading-tight slotcrate-brand">{t("home.title")}</h1>
        <p className="text-white/75 text-base md:text-lg">{t("home.subtitle")}</p>
      </div>

      <div className="mt-12 border-y border-white/15">
        <Link href="/generator" className="slotcrate-tool-row group">
          <div>
            <h2 className="text-xl font-semibold">{t("home.generator.title")}</h2>
            <p className="mt-1 text-sm text-white/65">{t("home.generator.description")}</p>
          </div>
          <span className="slotcrate-row-action">{t("home.generator.cta")} <span aria-hidden="true">→</span></span>
        </Link>

        <Link href="/planner" className="slotcrate-tool-row group">
          <div>
            <h2 className="text-xl font-semibold">{t("home.planner.title")}</h2>
            <p className="mt-1 text-sm text-white/65">{t("home.planner.description")}</p>
          </div>
          <span className="slotcrate-row-action">{t("home.planner.cta")} <span aria-hidden="true">→</span></span>
        </Link>

        <Link href="/cover" className="slotcrate-tool-row group">
          <div>
            <h2 className="text-xl font-semibold">{t("home.cover.title")}</h2>
            <p className="mt-1 text-sm text-white/65">{t("home.cover.description")}</p>
          </div>
          <span className="slotcrate-row-action">{t("home.cover.cta")} <span aria-hidden="true">→</span></span>
        </Link>

        <Link href="/inlay" className="slotcrate-tool-row group">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{t("home.inlay.title")}</h2>
              <span className="slotcrate-status">{t("inDevelopmentBadge")}</span>
            </div>
            <p className="mt-1 text-sm text-white/65">{t("home.inlay.description")}</p>
          </div>
          <span className="slotcrate-row-action">{t("home.inlay.cta")} <span aria-hidden="true">→</span></span>
        </Link>
      </div>

      <a href={slotcrateHref} target="_blank" rel="noreferrer" className="mt-6 inline-block text-sm text-white/55 hover:text-white underline-offset-4 hover:underline">
        {t("home.website.cta")} ↗
      </a>
    </section>
  );
}
