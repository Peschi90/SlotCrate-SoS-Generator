import type { Metadata } from "next";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Locale } from "@/i18n/request";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("meta.title"),
    description: t("meta.description")
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const t = await getTranslations();
  const slotcrateHref = locale === "en" ? "https://slotcrate.i3ull3t.de/en/" : "https://slotcrate.i3ull3t.de/";
  return (
    <html lang={locale}>
      <body className="slotcrate-theme">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="slotcrate-bg" aria-hidden="true" />
          <div className="slotcrate-grid" aria-hidden="true" />
          <div className="min-h-screen flex flex-col relative">
            <header className="border-b border-white/10 bg-black/35 backdrop-blur-md px-6 py-4 flex items-center gap-6 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <span className="text-xl font-semibold tracking-wider slotcrate-brand">{t("brand")}</span>
                <span className="hidden sm:inline text-xs text-white/60">Transport. Organize. Race.</span>
              </div>
              <nav className="flex flex-1 flex-wrap items-center gap-3 text-sm text-white/85">
                <Link href="/generator" className="slotcrate-navlink">
                  {t("nav.generator")}
                </Link>
                <Link href="/planner" className="slotcrate-navlink">
                  {t("nav.planner")}
                </Link>
                <a
                  href={slotcrateHref}
                  target="_blank"
                  rel="noreferrer"
                  className="slotcrate-navcta"
                >
                  {t("nav.website")}
                </a>
                <LanguageSwitcher current={locale} />
              </nav>
            </header>
            <main className="flex-1 relative z-10">{children}</main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
