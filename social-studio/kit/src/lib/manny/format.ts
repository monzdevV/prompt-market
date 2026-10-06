import type { PlanScript } from "./types";

/** Utilidades puras de presentación: valen en servidor y en navegador. */

const COMPACT = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });
const FULL = new Intl.NumberFormat("es-ES");

/** 118 mil · 1,4 M. «—» si no hay dato. */
export const compact = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n < 1000 ? FULL.format(n) : COMPACT.format(n));
export const full = (n: number | null | undefined) => (n === null || n === undefined ? "—" : FULL.format(n));

/** 0,0123 → «1,2 %» */
export const pct = (n: number | null | undefined, digits = 1) => (n === null || n === undefined ? "—" : `${(n * 100).toFixed(digits).replace(".", ",")} %`);

/** 33,2 → «×33» · 2,4 → «×2,4» */
export const times = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `×${n >= 10 ? Math.round(n) : n.toFixed(1).replace(".", ",")}`);

export const duration = (s: number | null | undefined) => (s === null || s === undefined ? "—" : s < 90 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

/** «hace 3 días» a partir de una marca de tiempo. */
export function since(ms: number | null | undefined, now = Date.now()) {
  if (!ms) return "—";
  const min = Math.max(0, Math.round((now - ms) / 60_000));
  if (min < 60) return min < 2 ? "ahora" : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 60) return `hace ${d} días`;
  return `hace ${Math.round(d / 30)} meses`;
}

export type Piece = { text: string; em: boolean };

/** Parte un texto en trozos normales y resaltados: lo que va entre *asteriscos* o **dobles** se resalta. */
export function splitEmphasis(text: string): Piece[] {
  return text
    .split(/\*{1,2}([^*]+)\*{1,2}/g)
    .map((t, i) => ({ text: t, em: i % 2 === 1 }))
    .filter((p) => p.text);
}

/** El gancho tal cual se escribe en el vídeo, sin asteriscos. */
export const plainHook = (hook: string) => hook.replace(/\*+/g, "");

/** Guion entero como texto, para pegarlo en las notas del móvil o en CapCut. */
export function scriptToText(s: Pick<PlanScript, "titulo" | "formato" | "gancho" | "voz" | "planos" | "edicion" | "descripcion" | "hashtags">) {
  const list = (xs: string[]) => xs.map((x, i) => `${i + 1}. ${x}`).join("\n");
  return [
    `${s.titulo} (${s.formato})`,
    `GANCHO\n${plainHook(s.gancho)}`,
    `QUÉ DICES\n${s.voz.join("\n")}`,
    `PLANOS\n${list(s.planos)}`,
    `EDICIÓN\n${list(s.edicion)}`,
    `DESCRIPCIÓN\n${captionText(s)}`,
  ].join("\n\n");
}

/** Descripción + hashtags, lista para pegar en TikTok. */
export const captionText = (s: Pick<PlanScript, "descripcion" | "hashtags">) => [s.descripcion.trim(), s.hashtags.trim()].filter(Boolean).join(" ");

/** Día de la semana abreviado de hoy (Lun…Dom) en la zona del espacio de trabajo. */
export function todayKey(tz: string, now = Date.now()) {
  const wd = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: tz }).format(now);
  return { Mon: "Lun", Tue: "Mar", Wed: "Mié", Thu: "Jue", Fri: "Vie", Sat: "Sáb", Sun: "Dom" }[wd] ?? "Lun";
}

export const WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
export const DAY_LONG: Record<string, string> = { Lun: "Lunes", Mar: "Martes", Mié: "Miércoles", Jue: "Jueves", Vie: "Viernes", Sáb: "Sábado", Dom: "Domingo" };

/** Enlace a «Copiar» con el vídeo ya pegado y el análisis en marcha. */
export const analyzeHref = (url: string) => `/manny/copiar?url=${encodeURIComponent(url)}&go=1`;
