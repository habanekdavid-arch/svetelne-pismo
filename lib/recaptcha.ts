"use client";

// Google reCAPTCHA v3 in the browser — invisible: no pictures to click, Google
// scores how human the visit looks and the server decides
// (lib/recaptcha.server.ts). The script is loaded only once someone starts
// filling a form, not on every page, and only when the site key is set
// (NEXT_PUBLIC_RECAPTCHA_SITE_KEY); without it the forms work as before.

export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
};

let loading: Promise<Grecaptcha | null> | null = null;

/** Loads Google's script once. Resolves null when there is no key or it will not load. */
export function loadRecaptcha(): Promise<Grecaptcha | null> {
  if (!RECAPTCHA_SITE_KEY || typeof window === "undefined") return Promise.resolve(null);
  if (!loading) {
    loading = new Promise((resolve) => {
      const done = () => {
        const g = (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
        if (g) g.ready(() => resolve(g));
        else resolve(null);
      };
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
      script.async = true;
      script.onload = done;
      script.onerror = () => {
        loading = null; // let a later attempt try again
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

/**
 * A fresh token for one submission (tokens live two minutes, so it is taken
 * right before sending). Null when reCAPTCHA is off or unreachable — the
 * server then decides whether to accept the form without it.
 */
export async function getRecaptchaToken(action: string): Promise<string | null> {
  const g = await loadRecaptcha();
  if (!g) return null;
  try {
    return await g.execute(RECAPTCHA_SITE_KEY, { action });
  } catch {
    return null;
  }
}
