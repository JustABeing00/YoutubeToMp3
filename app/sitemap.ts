import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PATHS = [
  "/",
  "/how-to-convert-video-to-mp3",
  "/faq",
  "/privacy",
  "/terms",
  "/about",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PATHS.map((p) => ({
    url: `${SITE_URL}${p === "/" ? "/" : p}`,
    lastModified: now,
  }));
}
