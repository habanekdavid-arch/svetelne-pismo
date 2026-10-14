"use client";

import { useEffect } from "react";

// Google Tag Manager — the container lib/analytics.ts pushes purchase events
// toward. Loaded once NEXT_PUBLIC_GTM_ID is set (e.g. "GTM-ABC1234"); what its
// tags may store is decided by the visitor in the CookieScript banner and
// passed on through Consent Mode (lib/cookie-script.ts), which starts with
// everything denied before this runs.

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? "";

export default function TagManager() {
  useEffect(() => {
    if (!GTM_ID || !/^GTM-[A-Z0-9]+$/.test(GTM_ID)) return;
    if (document.getElementById("gtm-script")) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.id = "gtm-script";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
    document.head.appendChild(s);
  }, []);

  return null;
}
