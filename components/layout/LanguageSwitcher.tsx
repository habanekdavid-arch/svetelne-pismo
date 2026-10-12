"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_INFO, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";
import FlagIcon from "@/components/layout/FlagIcon";

// The language picker — vytlacto3d's, in this site's colours. The choice is
// kept in a cookie for a year; the page is then rendered again on the server
// in the new language (router.refresh), so nothing the customer has open —
// the sign in the configurator, the cart — is lost.

function saveLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
}

/** A flag and a code in the header, opening the list of languages. */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    saveLocale(next);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("Zmeniť jazyk")}
        className="account-pill inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition"
      >
        <FlagIcon locale={locale} />
        <span>{LOCALE_INFO[locale].code}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          className={open ? "rotate-180 transition" : "transition"}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("Jazyk")}
          className="absolute right-0 top-12 z-[60] w-44 overflow-hidden rounded-2xl p-1 shadow-xl"
          style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
        >
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => choose(l)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:opacity-80"
                style={
                  l === locale
                    ? { background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--color-foreground)", fontWeight: 700 }
                    : { color: "var(--color-foreground-soft)" }
                }
              >
                <FlagIcon locale={l} />
                <span className="flex-1">{LOCALE_INFO[l].name}</span>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>{LOCALE_INFO[l].code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The languages as a row of buttons — in the mobile menu, where a dropdown has no room. */
export function LanguageButtons() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2" role="group" aria-label={t("Jazyk")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          onClick={() => {
            if (l === locale) return;
            saveLocale(l);
            router.refresh();
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition"
          style={
            l === locale
              ? { border: "1.5px solid var(--accent)", background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--color-foreground)" }
              : { border: "1px solid var(--color-border)", color: "var(--color-foreground-soft)" }
          }
        >
          <FlagIcon locale={l} />
          {LOCALE_INFO[l].code}
        </button>
      ))}
    </div>
  );
}
