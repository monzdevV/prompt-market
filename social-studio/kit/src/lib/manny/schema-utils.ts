import { z } from "zod";

/*
 * Lo que devuelve Claude no siempre respeta los límites de longitud que se le piden.
 * Pasarse de largo no es un error que merezca tirar el trabajo entero: se recorta.
 * Lo que sí se rechaza es lo que falta o es de otro tipo.
 */

/** Texto que se recorta a `max` caracteres (con «…» si se pasa). */
export const clip = (max: number) => z.string().transform((v) => (v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v));

/** Lista de al menos `min` elementos; si trae más de `max`, se queda con los primeros. */
export const list = <T extends z.ZodType>(item: T, max: number, min = 0) => z.array(item).min(min).transform((a) => a.slice(0, max));

/** Resumen corto de por qué falló una validación, para el registro. */
export const issues = (e: z.ZodError) =>
  e.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join(" | ");
