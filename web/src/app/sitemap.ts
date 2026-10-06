import type { MetadataRoute } from "next";
import { productos } from "@/lib/catalogo";
import { marca } from "@/lib/marca";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = marca.url.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    ...productos.map((p) => ({ url: `${base}/p/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...["licencia", "privacidad", "aviso-legal"].map((l) => ({ url: `${base}/legal/${l}`, priority: 0.2 })),
  ];
}
