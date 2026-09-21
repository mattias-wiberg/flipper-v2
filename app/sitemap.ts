import { getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();

  const now = new Date().toISOString();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/documentation`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/log-in`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
