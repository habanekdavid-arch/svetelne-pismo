import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";
import { SITE_URL } from "@/lib/site-url";

// The public pages for search engines. Accounts, orders and the admin are
// private and left out (see app/robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/blog", 0.7, "weekly"),
    ...blogPosts.map((p) => page(`/blog/${p.slug}`, 0.6, "monthly")),
    page("/kontakt", 0.5, "yearly"),
    page("/obchodne-podmienky", 0.3, "yearly"),
    page("/gdpr", 0.3, "yearly"),
    page("/cookies", 0.2, "yearly"),
  ];
}
