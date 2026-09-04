import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function resolveLocale(candidate: string | undefined | null): Locale {
  return LOCALES.includes((candidate ?? "") as Locale) ? (candidate as Locale) : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  const locale = resolveLocale(cookie);
  const messages = (await import(`./messages/${locale}.json`)).default;
  return { locale, messages };
});
