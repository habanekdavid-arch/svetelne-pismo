// Languages of the site — the same four as vytlacto3d, chosen the same way:
// a cookie set by the switcher in the header, or on a first visit the
// browser's own language. The address never changes with the language.
//
// Slovak is the original text, written straight in the code; every other
// language is a dictionary keyed by that Slovak text (lib/i18n/messages).
// A missing translation therefore shows the Slovak original, never a key.

export const LOCALES = ["sk", "en", "hu", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sk";
export const LOCALE_COOKIE = "rozsvietto_lang";

export const LOCALE_INFO: Record<Locale, { code: string; name: string; intl: string }> = {
  sk: { code: "SK", name: "Slovenčina", intl: "sk-SK" },
  en: { code: "EN", name: "English", intl: "en-GB" },
  hu: { code: "HU", name: "Magyar", intl: "hu-HU" },
  de: { code: "DE", name: "Deutsch", intl: "de-DE" },
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export type TranslateVars = Record<string, string | number>;
export type TFunction = (text: string, vars?: TranslateVars) => string;

/** Fills {placeholders} into a text. */
export function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

/** Translation by the dictionary; a missing one is the Slovak original. */
export function makeT(dict: Record<string, string>): TFunction {
  return (text, vars) => interpolate(dict[text] ?? text, vars);
}

/**
 * Marks a text kept in a constant (a list of steps, a table of labels) as one
 * that gets translated where it is shown — t(step.title). It returns the
 * text unchanged; it only lets the tooling find every text to translate.
 */
export const tk = (text: string): string => text;
