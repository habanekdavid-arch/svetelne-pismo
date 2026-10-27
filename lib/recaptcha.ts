"use client";

import { useEffect, useState } from "react";

// Google reCAPTCHA v3 in the browser — invisible: no pictures to click, Google
// scores how human the visit looks and the server decides
// (lib/recaptcha.server.ts). The site key is fetched from /api/recaptcha when
// first needed (so a key set in Vercel works without a rebuild), and Google's
// script is loaded only once someone starts filling a form. Without a key the
// forms work as before.

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
};

let keyRequest: Promise<string> | null = null;

/** The public site key, or "" when reCAPTCHA is off. */
export function getRecaptchaSiteKey(): Promise<string> {
  if (typeof window === "undefined") return Promise.resolve("");
  if (!keyRequest) {
    keyRequest = fetch("/api/recaptcha", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (typeof d?.siteKey === "string" ? d.siteKey : ""))
      .catch(() => {
        keyRequest = null; // ask again next time
        return "";
      });
  }
  return keyRequest;
}

/** Whether this site has reCAPTCHA switched on — for the notice under a form. */
export function useRecaptchaEnabled(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    getRecaptchaSiteKey().then((k) => { if (alive) setOn(Boolean(k)); });
    return () => { alive = false; };
  }, []);
  return on;
}

let loading: Promise<{ g: Grecaptcha; key: string } | null> | null = null;

/** Loads Google's script once. Resolves null when there is no key or it will not load. */
export function loadRecaptcha(): Promise<{ g: Grecaptcha; key: string } | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!loading) {
    loading = getRecaptchaSiteKey().then(
      (key) =>
        new Promise((resolve) => {
          if (!key) {
            loading = null;
            return resolve(null);
          }
          const done = () => {
            const g = (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
            if (g) g.ready(() => resolve({ g, key }));
            else resolve(null);
          };
          const script = document.createElement("script");
          script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
          script.async = true;
          script.onload = done;
          script.onerror = () => {
            loading = null; // let a later attempt try again
            resolve(null);
          };
          document.head.appendChild(script);
        }),
    );
  }
  return loading;
}

/**
 * A fresh token for one submission (tokens live two minutes, so it is taken
 * right before sending). Null when reCAPTCHA is off or unreachable — the
 * server then decides whether to accept the form without it.
 */
export async function getRecaptchaToken(action: string): Promise<string | null> {
  const loaded = await loadRecaptcha();
  if (!loaded) return null;
  try {
    return await loaded.g.execute(loaded.key, { action });
  } catch {
    return null;
  }
}
