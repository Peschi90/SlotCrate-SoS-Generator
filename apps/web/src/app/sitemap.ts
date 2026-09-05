import type { MetadataRoute } from "next";
import { PUBLIC_SITE_PATHS, SITE_URL } from "@/lib/seo";

const PRIORITY_BY_PATH: Record<(typeof PUBLIC_SITE_PATHS)[number], number> = {
  "/": 1,
  "/generator": 0.9,
  "/planner": 0.9,
  "/impressum": 0.3,
  "/datenschutz": 0.3
};

const CHANGE_FREQUENCY_BY_PATH: Record<(typeof PUBLIC_SITE_PATHS)[number], MetadataRoute.Sitemap[number]["changeFrequency"]> = {
  "/": "weekly",
  "/generator": "weekly",
  "/planner": "weekly",
  "/impressum": "monthly",
  "/datenschutz": "monthly"
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_SITE_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: CHANGE_FREQUENCY_BY_PATH[path],
    priority: PRIORITY_BY_PATH[path]
  }));
}