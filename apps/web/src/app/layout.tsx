import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Rajdhani } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Locale } from "@/i18n/request";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

// next/font lädt die Schriften zur Build-Zeit und bettet sie ins Bundle ein.
// Zur Laufzeit werden keine Anfragen an fonts.googleapis.com gesendet.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter"
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-rajdhani"
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  return {
    metadataBase: new URL(SITE_URL),
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: {
      canonical: "/"
    },
    openGraph: {
      type: "website",
      url: SITE_URL,
      title: t("meta.title"),
      description: t("meta.description"),
      siteName: t("brand"),
      locale: locale === "de" ? "de_DE" : "en_US",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: t("meta.ogImageAlt")
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: t("meta.title"),
      description: t("meta.description"),
      images: ["/opengraph-image"]
    },
    icons: {
      icon: [
        { url: "/SC-SOS-Logo.png", type: "image/png" },
        { url: "/favicon.ico" }
      ],
      shortcut: [{ url: "/SC-SOS-Logo.png", type: "image/png" }],
      apple: [{ url: "/SC-SOS-Logo.png", type: "image/png" }]
    }
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const t = await getTranslations();
  const slotcrateHref = locale === "en" ? "https://slotcrate.i3ull3t.de/en/" : "https://slotcrate.i3ull3t.de/";
  return (
    <html lang={locale} className={`${inter.variable} ${rajdhani.variable}`}>
      <body className="slotcrate-theme">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="slotcrate-bg" aria-hidden="true" />
          <div className="slotcrate-grid" aria-hidden="true" />
          <div className="min-h-screen flex flex-col relative">
            <header className="border-b border-white/10 bg-black/35 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <Link href="/" className="text-xl font-semibold tracking-wider slotcrate-brand hover:text-white">
                  {t("brand")}
                </Link>
                <span className="hidden sm:inline text-xs text-white/60">Transport. Organize. Race.</span>
                <LanguageSwitcher current={locale} className="ml-auto hidden md:flex" />
                <details className="ml-auto md:hidden relative">
                  <summary className="slotcrate-menubutton">{t("nav.menu")}</summary>
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/15 bg-black/90 p-3 shadow-2xl">
                    <nav className="flex flex-col gap-2 text-sm text-white/90">
                      <Link href="/" className="slotcrate-navlink text-center">
                        {t("nav.home")}
                      </Link>
                      <Link href="/generator" className="slotcrate-navlink text-center">
                        {t("nav.generator")}
                      </Link>
                      <Link href="/planner" className="slotcrate-navlink text-center">
                        {t("nav.planner")}
                      </Link>
                      <a
                        href={slotcrateHref}
                        target="_blank"
                        rel="noreferrer"
                        className="slotcrate-navcta text-center"
                      >
                        {t("nav.website")}
                      </a>
                    </nav>
                    <LanguageSwitcher current={locale} className="mt-3" />
                  </div>
                </details>
              </div>
              <nav className="mt-3 hidden md:flex flex-wrap items-center gap-3 text-sm text-white/85">
                <Link href="/" className="slotcrate-navlink">
                  {t("nav.home")}
                </Link>
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
              </nav>
            </header>
            <main className="flex-1 relative z-10">{children}</main>
            <footer className="border-t border-white/10 bg-black/35 backdrop-blur-md px-6 py-4 mt-auto relative z-10">
              <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/70">
                <Link href="/impressum" className="hover:text-white underline-offset-4 hover:underline">
                  {t("nav.imprint")}
                </Link>
                <span aria-hidden="true" className="text-white/30">·</span>
                <Link href="/datenschutz" className="hover:text-white underline-offset-4 hover:underline">
                  {t("nav.privacy")}
                </Link>
              </nav>
            </footer>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
