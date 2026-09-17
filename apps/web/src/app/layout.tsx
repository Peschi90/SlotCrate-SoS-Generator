import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Anton,
  Archivo_Black,
  Audiowide,
  Barlow_Condensed,
  Bebas_Neue,
  Black_Ops_One,
  Chakra_Petch,
  Exo_2,
  Michroma,
  Orbitron,
  Oswald,
  Rajdhani,
  Righteous,
  Roboto_Condensed,
  Russo_One,
  Saira_Condensed,
  Teko,
  Inter
} from "next/font/google";
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

const robotoCondensed = Roboto_Condensed({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-roboto-condensed" });
const barlowCondensed = Barlow_Condensed({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-barlow-condensed" });
const oswald = Oswald({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-oswald" });
const chakraPetch = Chakra_Petch({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-chakra-petch" });
const sairaCondensed = Saira_Condensed({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-saira-condensed" });
const archivoBlack = Archivo_Black({ weight: "400", subsets: ["latin"], variable: "--font-archivo-black" });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas-neue" });
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const russoOne = Russo_One({ weight: "400", subsets: ["latin"], variable: "--font-russo-one" });
const teko = Teko({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-teko" });
const blackOpsOne = Black_Ops_One({ weight: "400", subsets: ["latin"], variable: "--font-black-ops-one" });
const audiowide = Audiowide({ weight: "400", subsets: ["latin"], variable: "--font-audiowide" });
const orbitron = Orbitron({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-orbitron" });
const michroma = Michroma({ weight: "400", subsets: ["latin"], variable: "--font-michroma" });
const exo2 = Exo_2({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-exo-2" });
const righteous = Righteous({ weight: "400", subsets: ["latin"], variable: "--font-righteous" });

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
    <html lang={locale} className={`${inter.variable} ${rajdhani.variable} ${robotoCondensed.variable} ${barlowCondensed.variable} ${oswald.variable} ${chakraPetch.variable} ${sairaCondensed.variable} ${archivoBlack.variable} ${bebasNeue.variable} ${anton.variable} ${russoOne.variable} ${teko.variable} ${blackOpsOne.variable} ${audiowide.variable} ${orbitron.variable} ${michroma.variable} ${exo2.variable} ${righteous.variable}`}>
      <body className="slotcrate-theme">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="slotcrate-bg" aria-hidden="true" />
          <div className="slotcrate-grid" aria-hidden="true" />
          <div className="min-h-screen flex flex-col relative">
            <header className="border-b border-white/10 bg-black/35 backdrop-blur-md px-4 py-3 sm:px-6 sticky top-0 z-20">
              <div className="flex items-center gap-4 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-wider slotcrate-brand hover:text-white">
                  <Image
                    src="/SC-SOS-Logo.png"
                    alt=""
                    aria-hidden="true"
                    width={34}
                    height={34}
                    className="h-8 w-8 rounded-md border border-white/20 bg-white/5 object-contain"
                    priority
                  />
                  <span>{t("brand")}</span>
                </Link>
                <nav className="ml-auto hidden md:flex items-center gap-1 text-sm text-white/85">
                  <Link href="/generator" className="slotcrate-navlink">{t("nav.generator")}</Link>
                  <Link href="/planner" className="slotcrate-navlink">{t("nav.planner")}</Link>
                  <Link href="/cover" className="slotcrate-navlink">{t("nav.cover")}</Link>
                  <Link href="/inlay" className="slotcrate-navlink flex items-center gap-1.5">
                    <span>{t("nav.inlay")}</span>
                    <span className="slotcrate-status">{t("inDevelopmentBadge")}</span>
                  </Link>
                </nav>
                <LanguageSwitcher current={locale} className="hidden md:flex" />
                <details className="ml-auto md:hidden relative">
                  <summary className="slotcrate-menubutton">{t("nav.menu")}</summary>
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/15 bg-black/90 p-3 shadow-2xl">
                    <nav className="flex flex-col gap-2 text-sm text-white/90">
                      <Link href="/generator" className="slotcrate-navlink text-center">
                        {t("nav.generator")}
                      </Link>
                      <Link href="/planner" className="slotcrate-navlink text-center">
                        {t("nav.planner")}
                      </Link>
                      <Link href="/inlay" className="slotcrate-navlink text-center flex items-center justify-center gap-1.5">
                        <span>{t("nav.inlay")}</span>
                        <span className="slotcrate-status">{t("inDevelopmentBadge")}</span>
                      </Link>
                      <Link href="/cover" className="slotcrate-navlink text-center">
                        {t("nav.cover")}
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
            </header>
            <main className="flex-1 relative z-10">{children}</main>
            <footer className="border-t border-white/10 bg-black/35 backdrop-blur-md px-6 py-4 mt-auto relative z-10">
              <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/70">
                <a href={slotcrateHref} target="_blank" rel="noreferrer" className="hover:text-white underline-offset-4 hover:underline">
                  {t("nav.website")}
                </a>
                <span aria-hidden="true" className="text-white/30">·</span>
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
