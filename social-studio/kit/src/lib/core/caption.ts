import type { Platform } from "../db";

/** Límites de texto de cada red (caracteres). */
export const CAPTION_LIMIT: Record<Platform, number> = {
  instagram: 2200,
  tiktok: 2200,
  facebook: 63206,
  youtube: 5000,
  linkedin: 3000,
  // X: 280 para cuentas normales (más solo con X Premium)
  x: 280,
};

export const YOUTUBE_TITLE_LIMIT = 100;

/** "#Patinaje Madrid" -> "PatinajeMadrid". Devuelve "" si no queda nada útil. */
export function normalizeHashtag(tag: string) {
  return tag
    .trim()
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{N}_]/gu, "");
}

/** Normaliza, quita vacíos y duplicados (sin distinguir mayúsculas) y respeta el orden. */
export function normalizeHashtags(tags: string[], max = 30) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const n = normalizeHashtag(t);
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

export function buildCaption(description: string, hashtags: string[]) {
  const tags = hashtags.map((t) => `#${t}`).join(" ");
  const text = description.trim();
  return tags ? `${text}\n\n${tags}` : text;
}

/** Redes cuyo límite se supera con este texto. */
export function overLimit(caption: string, platforms: Platform[]) {
  return [...new Set(platforms)].filter((p) => caption.length > CAPTION_LIMIT[p]);
}

/** Recorta en el último espacio antes del límite para no partir palabras. */
export function clipWords(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "");
}
