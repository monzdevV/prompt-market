import type { InteraccionCompleta, TipoInteraccion } from "@/lib/b2b";
import { MARCA } from "@/marca";

/** Utilidades puras (valen en servidor y cliente) de actividad y tareas. */

export const esTarea = (t: TipoInteraccion) => t === "tarea" || t === "seguimiento";

export const ZONA = MARCA.zonaHoraria;
const formatoClave = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

/** "2026-09-24" del instante dado, en hora de Madrid. */
export const claveDia = (d: string | number | Date) => formatoClave.format(new Date(d));

const formatoDiaLargo = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA });
const formatoDiaAnio = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: ZONA });

function desplazar(clave: string, dias: number) {
  const [a, m, d] = clave.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias, 12));
  return f.toISOString().slice(0, 10);
}

/** "Hoy", "Ayer", "Mañana" o "martes, 22 de septiembre". */
export function etiquetaDia(clave: string, ahora = Date.now()) {
  const hoy = claveDia(ahora);
  if (clave === hoy) return "Hoy";
  if (clave === desplazar(hoy, -1)) return "Ayer";
  if (clave === desplazar(hoy, 1)) return "Mañana";
  const fecha = new Date(`${clave}T12:00:00Z`);
  const texto = (clave.slice(0, 4) === hoy.slice(0, 4) ? formatoDiaLargo : formatoDiaAnio).format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export { desplazar as desplazarDia };

export const esVencida = (i: Pick<InteraccionCompleta, "estado" | "fecha">, ahora = Date.now()) =>
  i.estado === "pendiente" && new Date(i.fecha).getTime() < ahora;

/** Agrupa por día conservando el orden de entrada. */
export function agruparPorDia<T extends { fecha: string }>(items: T[]) {
  const grupos: { clave: string; items: T[] }[] = [];
  for (const it of items) {
    const clave = claveDia(it.fecha);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.clave === clave) ultimo.items.push(it);
    else grupos.push({ clave, items: [it] });
  }
  return grupos;
}

/** Casilla redonda para completar tareas (el tono de acento al marcarla). */
export const claseCasilla =
  "peer grid size-[18px] shrink-0 cursor-pointer appearance-none place-items-center rounded-full border-[1.5px] border-tinta-2/60 bg-transparent bg-center bg-no-repeat transition-colors hover:border-acento checked:border-acento checked:bg-acento focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento/50 disabled:cursor-not-allowed disabled:opacity-40 checked:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M12.2 4.6 6.7 10.1 3.8 7.2l-1 1 3.9 3.9 6.5-6.5z'/%3E%3C/svg%3E\")]";
