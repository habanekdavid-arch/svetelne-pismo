// Cookie consent is run by CookieScript (cookie-script.com): its banner asks,
// stores the answer and hands it to Google through Consent Mode v2. The site
// only sets the starting point — everything denied — before any Google tag
// runs, and opens CookieScript's settings from the footer and /cookies.

/** The rozsvietto.sk banner from the CookieScript dashboard. */
export const COOKIE_SCRIPT_SRC = "https://cdn.cookie-script.com/s/0fee6588ee91c855031ae701783a66a7.js";

/** Google Ads account (Google tag, gtag.js). */
export const GOOGLE_ADS_ID = "AW-18512974601";

/** Google Tag Manager container (Správca značiek Google). */
export const GTM_ID = "GTM-MTH3RNWC";

/**
 * The container snippet exactly as Google hands it out. It runs after the
 * Consent Mode defaults and CookieScript (app/layout.tsx), so every tag in
 * the container sees the visitor's choice; GA4 purchases pushed to dataLayer
 * by lib/analytics.ts land in it too.
 */
export const GTM_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

/**
 * Runs before CookieScript and before gtag.js loads. Consent Mode v2 starts
 * with every storage denied; CookieScript updates it the moment the visitor
 * chooses (and on every later visit, from the stored choice). Until then the
 * Google tag stores no cookies and sends only cookieless pings.
 */
export const CONSENT_DEFAULT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'granted',
  wait_for_update: 500
});
gtag('set', 'ads_data_redaction', true);
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');
`;

declare global {
  interface Window {
    CookieScript?: { instance?: { show?: () => void } };
  }
}

/** Brings CookieScript's banner back so the visitor can change their choice. */
export function openCookieSettings() {
  window.CookieScript?.instance?.show?.();
}
