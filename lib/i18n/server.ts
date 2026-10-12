import "server-only";

import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale } from "@/lib/i18n/config";
import { dictionaryFor } from "@/lib/i18n/messages";

// Browser languages that map onto ours. Czech reads Slovak without effort.
const HEADER_LOCALES: Record<string, Locale> = { sk: "sk", cs: "sk", en: "en", hu: "hu", de: "de" };

/** The language from the cookie; on a first visit, the browser's. */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const lang = part.trim().slice(0, 2).toLowerCase();
    if (lang in HEADER_LOCALES) return HEADER_LOCALES[lang];
  }
  return DEFAULT_LOCALE;
}

/** For Server Components: the language and its translate function. */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(dictionaryFor(locale)) };
}
