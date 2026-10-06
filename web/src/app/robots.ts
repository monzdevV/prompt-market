import type { MetadataRoute } from "next";
import { marca } from "@/lib/marca";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${marca.url.replace(/\/$/, "")}/sitemap.xml`,
  };
}
