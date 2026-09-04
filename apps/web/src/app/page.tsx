import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getLocale } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const slotcrateHref = locale === "en" ? "https://slotcrate.i3ull3t.de/en/" : "https://slotcrate.i3ull3t.de/";
  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <div className="rounded-3xl border border-white/15 bg-black/45 backdrop-blur-md overflow-hidden">
        <div className="px-8 py-10 md:px-12 md:py-14">
          <p className="uppercase tracking-[0.28em] text-xs text-white/65 mb-4">DIY 3D Print Tools</p>
          <h1 className="text-4xl md:text-5xl font-semibold mb-4 leading-tight slotcrate-brand">{t("home.title")}</h1>
          <p className="text-white/80 max-w-3xl text-base md:text-lg">{t("home.subtitle")}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="slotcrate-button-primary" href="/generator">
              {t("home.generator.cta")}
            </Link>
            <Link className="slotcrate-button-secondary" href="/planner">
              {t("home.planner.cta")}
            </Link>
            <a
              href={slotcrateHref}
              target="_blank"
              rel="noreferrer"
              className="slotcrate-button-secondary"
            >
              {t("home.website.cta")}
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-0 border-t border-white/10">
          <article className="slotcrate-card">
            <h2 className="text-lg font-semibold mb-1">{t("home.generator.title")}</h2>
            <p className="text-white/70 text-sm mb-4">{t("home.generator.description")}</p>
            <Link className="slotcrate-inline-link" href="/generator">
              {t("home.generator.cta")}
            </Link>
          </article>

          <article className="slotcrate-card">
            <h2 className="text-lg font-semibold mb-1">{t("home.planner.title")}</h2>
            <p className="text-white/70 text-sm mb-4">{t("home.planner.description")}</p>
            <Link className="slotcrate-inline-link" href="/planner">
              {t("home.planner.cta")}
            </Link>
          </article>

          <article className="slotcrate-card">
            <h2 className="text-lg font-semibold mb-1">{t("home.website.title")}</h2>
            <p className="text-white/70 text-sm mb-4">{t("home.website.description")}</p>
            <a href={slotcrateHref} target="_blank" rel="noreferrer" className="slotcrate-inline-link">
              {t("home.website.cta")}
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
