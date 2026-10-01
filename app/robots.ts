import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Search engines get the shop and the blog; accounts, orders, checkout pages
// and the admin stay out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/ucet",
        "/moje-objednavky",
        "/objednavka/",
        "/dakujeme/",
        "/nedokoncena/",
        "/obnova-hesla",
        "/overenie-emailu",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
