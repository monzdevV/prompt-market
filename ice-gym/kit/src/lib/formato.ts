import { MARCA } from "@/marca";

const ZONA = MARCA.zonaHoraria;
const LOCALE = MARCA.locale;

const euros = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: MARCA.moneda,
  maximumFractionDigits: 0,
});

const eurosExactos = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: MARCA.moneda,
  minimumFractionDigits: 2,
});

const enteros = new Intl.NumberFormat(LOCALE);

export function dinero(valor: number | string | null | undefined) {
  return euros.format(Number(valor ?? 0));
}

export function dineroExacto(valor: number | string | null | undefined) {
  return eurosExactos.format(Number(valor ?? 0));
}

export function numero(valor: number | string | null | undefined) {
  return enteros.format(Number(valor ?? 0));
}

export function porcentaje(valor: number, decimales = 0) {
  if (!Number.isFinite(valor)) return "—";
  return `${valor.toFixed(decimales).replace(".", ",")} %`;
}

export function fecha(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: ZONA,
  }).format(new Date(iso));
}

export function fechaHora(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  }).format(new Date(iso));
}

export function hora(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  }).format(new Date(iso));
}

export function mesLargo(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: ZONA })
    .format(new Date(iso));
}

export function mesCorto(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: ZONA })
    .format(new Date(iso))
    .replace(".", "");
}

export function diaSemanaCorto(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: ZONA })
    .format(new Date(iso))
    .replace(".", "");
}

/** "hace 3 días", "en 2 semanas". */
export function relativo(iso: string | null | undefined) {
  if (!iso) return "—";
  const dias = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  if (Math.abs(dias) < 31) return rtf.format(dias, "day");
  return rtf.format(Math.round(dias / 30), "month");
}

export function iniciales(nombre: string, apellidos?: string | null) {
  const a = nombre.trim().charAt(0);
  const b = (apellidos ?? "").trim().charAt(0) || nombre.trim().split(" ")[1]?.charAt(0) || "";
  return (a + b).toUpperCase();
}

/** Primer día del mes actual en formato YYYY-MM-DD, en la zona horaria de la marca. */
export function inicioDeMes(desplazamientoMeses = 0) {
  const ahora = new Date();
  const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + desplazamientoMeses, 1));
  return d.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------
   Texto natural: números en letra y listas con "y"
   --------------------------------------------------------------- */

const LETRA = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis"];

/** 1-6 en letra con concordancia ("un"/"una"); a partir de 7, la cifra. */
export function numeroEnLetra(n: number, genero: "m" | "f" = "m") {
  if (!Number.isInteger(n) || n < 0 || n >= LETRA.length) return String(n);
  if (n === 1) return genero === "f" ? "una" : "un";
  return LETRA[n];
}

/** "un centro", "tres centros", "una ciudad". */
export function cantidadEnLetra(n: number, singular: string, plural: string, genero: "m" | "f" = "m") {
  return `${numeroEnLetra(n, genero)} ${n === 1 ? singular : plural}`;
}

export function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** ["Madrid", "Barcelona", "Valencia"] → "Madrid, Barcelona y Valencia" ("e" ante "i-"/"hi-"). */
export function listaNatural(items: readonly string[]) {
  const lista = items.filter(Boolean);
  if (lista.length <= 1) return lista[0] ?? "";
  const ultimo = lista[lista.length - 1];
  const y = /^h?i(?![aeiou])/i.test(ultimo.normalize("NFD").replace(/[̀-ͯ]/g, "")) ? "e" : "y";
  return `${lista.slice(0, -1).join(", ")} ${y} ${ultimo}`;
}
