import type { Locale } from "@/lib/i18n/config";
import account from "./account";
import checkout from "./checkout";
import configurator from "./configurator";
import content from "./content";
import home from "./home";
import layout from "./layout";

/**
 * Translations keyed by the original Slovak text — the code keeps reading
 * as Slovak, and a missing translation shows up in Slovak rather than as a
 * key. One file per part of the site.
 */
export type Messages = Record<string, { en: string; hu: string; de: string }>;

const ALL: Messages = {
  ...layout,
  ...home,
  ...configurator,
  ...checkout,
  ...account,
  ...content,
};

const cache = new Map<Locale, Record<string, string>>();

export function dictionaryFor(locale: Locale): Record<string, string> {
  if (locale === "sk") return {};
  let dict = cache.get(locale);
  if (!dict) {
    dict = {};
    for (const [sk, tr] of Object.entries(ALL)) dict[sk] = tr[locale];
    cache.set(locale, dict);
  }
  return dict;
}
