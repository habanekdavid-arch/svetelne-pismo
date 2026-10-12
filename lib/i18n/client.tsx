"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, makeT, type Locale, type TFunction } from "@/lib/i18n/config";

type Ctx = { locale: Locale; t: TFunction };

const LocaleContext = createContext<Ctx>({ locale: DEFAULT_LOCALE, t: makeT({}) });

/**
 * The dictionary for the visitor's language comes from the server (the root
 * layout), so only that one language travels to the browser — the
 * translations are never part of the JavaScript bundle.
 */
export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Record<string, string>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: makeT(dict) }), [locale, dict]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT(): TFunction {
  return useContext(LocaleContext).t;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
