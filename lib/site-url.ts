// The site's public address — what search engines, shared links and the
// sitemap point at. NEXT_PUBLIC_SITE_URL wins; otherwise the live domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rozsvietto.sk").replace(/\/$/, "");
