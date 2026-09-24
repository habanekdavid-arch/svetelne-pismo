"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getConsent, subscribeConsent } from "@/lib/consent";

// Google Tag Manager — the container lib/analytics.ts has been pushing
// purchase events toward. Loaded only when both are true:
//   · NEXT_PUBLIC_GTM_ID is set (e.g. "GTM-ABC1234"), and
//   · the visitor has accepted analytics cookies (lib/consent.ts).
// Without either, no Google script ever reaches the page. Accepting cookies
// later loads it on the spot; the purchases pushed meanwhile wait in dataLayer.

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? "";

export default function TagManager() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);

  useEffect(() => {
    if (!GTM_ID || !/^GTM-[A-Z0-9]+$/.test(GTM_ID) || consent !== "accepted") return;
    if (document.getElementById("gtm-script")) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.id = "gtm-script";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
    document.head.appendChild(s);
  }, [consent]);

  return null;
}
