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
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-neutral-800 px-6 py-3 flex items-center gap-6">
              <span className="font-semibold">{t("brand")}</span>
              <nav className="flex flex-1 flex-wrap items-center gap-4 text-sm text-neutral-300">
                <Link href="/generator" className="hover:text-white">
                  {t("nav.generator")}
                </Link>
                <Link href="/planner" className="hover:text-white">
                  {t("nav.planner")}
                </Link>
                <LanguageSwitcher current={locale} />
              </nav>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
