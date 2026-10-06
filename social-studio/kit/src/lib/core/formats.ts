import type { Platform } from "../db";

/*
 * Formatos de publicación por red, según su documentación oficial (consultada el 23/09/2026):
 *  - YouTube: no hay un parámetro «Short» en la API. YouTube lo clasifica solo: hasta 3 min y
 *    vertical o cuadrado. support.google.com/youtube/answer/12779649
 *  - Instagram: POST /{ig-user-id}/media con media_type=REELS (share_to_feed true/false) o STORIES.
 *    Reels 3 s–15 min, historias 3–60 s. thumb_offset elige el fotograma de portada (vídeos y reels).
 *    developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
 *  - Facebook: vídeo (/{page-id}/videos, admite imagen de portada `thumb`), Reel (/video_reels) e
 *    historia (/video_stories), ambos 9:16 y 3–90 s.
 *    developers.facebook.com/docs/video-api/guides/reels-publishing · /docs/page-stories-api
 *  - TikTok: solo vídeo; la portada es un fotograma (video_cover_timestamp_ms).
 *  - X: vídeo de hasta 140 s y texto de 280 caracteres en cuentas sin Premium.
 */

export type FormatId = "short" | "video" | "reel" | "reel_only" | "story";
/** Qué portada acepta: una imagen propia, un fotograma del vídeo, o ninguna */
export type CoverKind = "image" | "frame" | "none";
/** Forma del vídeo (ancho/alto). YouTube solo hace Short de vídeos verticales o cuadrados. */
export type Shape = "vertical" | "square" | "horizontal";
export type FormatDef = {
  id: FormatId;
  label: string;
  hint: string;
  minS?: number;
  maxS?: number;
  cover: CoverKind;
  /** Formas admitidas (sin definir = cualquiera) */
  shapes?: Shape[];
};

/** Forma a partir de las medidas del vídeo; cuadrado con un 5 % de margen. */
export function shapeOf(width: number, height: number): Shape | null {
  if (!width || !height) return null;
  const r = width / height;
  if (r > 1.05) return "horizontal";
  if (r < 0.95) return "vertical";
  return "square";
}

export const FORMATS: Partial<Record<Platform, FormatDef[]>> = {
  youtube: [
    {
      id: "short",
      label: "Short",
      hint: "Hasta 3 minutos y vertical o cuadrado. Es YouTube quien decide mostrarlo como Short según esas medidas.",
      maxS: 180,
      cover: "image",
      shapes: ["vertical", "square"],
    },
    {
      id: "video",
      label: "Vídeo",
      hint: "Vídeo normal del canal. Si es vertical y dura 3 minutos o menos, YouTube puede mostrarlo igualmente como Short.",
      cover: "image",
    },
  ],
  instagram: [
    { id: "reel", label: "Reel", hint: "Sale en tu perfil y en la pestaña Reels.", minS: 3, maxS: 900, cover: "frame" },
    { id: "reel_only", label: "Solo en Reels", hint: "Sale en la pestaña Reels, pero no en la cuadrícula de tu perfil.", minS: 3, maxS: 900, cover: "frame" },
    { id: "story", label: "Historia", hint: "Visible 24 horas, de 3 a 60 segundos. Las historias no llevan el texto ni la portada.", minS: 3, maxS: 60, cover: "none" },
  ],
  facebook: [
    { id: "video", label: "Vídeo", hint: "Vídeo publicado en tu Página.", cover: "image" },
    { id: "reel", label: "Reel", hint: "Vertical (9:16), de 3 a 90 segundos. La portada la elige Facebook.", minS: 3, maxS: 90, cover: "none", shapes: ["vertical"] },
    { id: "story", label: "Historia", hint: "Vertical (9:16), de 3 a 90 segundos. Visible 24 horas, sin texto.", minS: 3, maxS: 90, cover: "none", shapes: ["vertical"] },
  ],
  tiktok: [{ id: "video", label: "Vídeo", hint: "", cover: "frame" }],
  // X por la API: vídeos de hasta 2 min 20 s en cuentas normales (help.x.com, «Cómo compartir vídeos»)
  x: [{ id: "video", label: "Vídeo", hint: "Hasta 2 minutos y 20 segundos. El texto, como máximo 280 caracteres.", maxS: 140, cover: "none" }],
};

export function formatDef(platform: Platform, id: FormatId | undefined): FormatDef | undefined {
  const list = FORMATS[platform];
  return list?.find((f) => f.id === id) ?? list?.[0];
}

/** Formato por defecto: el más habitual para un vídeo corto vertical (lo que sube casi todo el mundo). */
export function defaultFormat(platform: Platform, durationS: number | null, shape: Shape | null = null): FormatId | undefined {
  if (platform === "youtube") return (durationS !== null && durationS > 180) || shape === "horizontal" ? "video" : "short";
  return FORMATS[platform]?.[0]?.id;
}

export function isValidFormat(platform: Platform, id: unknown): id is FormatId {
  return !!FORMATS[platform]?.some((f) => f.id === id);
}

/** Problema de duración para ese formato (null si vale o si aún no sabemos cuánto dura). */
export function formatProblem(
  platform: Platform,
  id: FormatId | undefined,
  durationS: number | null,
  label: string,
  shape: Shape | null = null,
): string | null {
  const f = formatDef(platform, id);
  if (!f) return null;
  if (shape && f.shapes && !f.shapes.includes(shape)) {
    const need = f.shapes.includes("square") ? "vertical o cuadrado" : "vertical (9:16)";
    return `${label} · ${f.label}: tu vídeo es ${shape === "horizontal" ? "horizontal" : "cuadrado"} y tiene que ser ${need}${
      platform === "youtube" ? " (si no, YouTube lo publica como vídeo normal). Elige «Vídeo» o sube un vídeo vertical" : ""
    }.`;
  }
  if (durationS === null) return null;
  const d = Math.round(durationS);
  if (f.maxS !== undefined && durationS > f.maxS + 0.5) {
    return `${label} · ${f.label}: dura ${d} s y el máximo es ${f.maxS >= 120 ? `${Math.round(f.maxS / 60)} min` : `${f.maxS} s`}`;
  }
  if (f.minS !== undefined && durationS < f.minS) return `${label} · ${f.label}: dura ${d} s y el mínimo es ${f.minS} s`;
  return null;
}
