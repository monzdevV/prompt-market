import { sinMarca } from "@/marca";

type CentroBasico = { nombre: string; ciudad: string };

/** Ciudades sin repetir, en el orden en que aparecen. */
export function ciudadesUnicas(centros: readonly CentroBasico[]) {
  return [...new Set(centros.map((c) => c.ciudad))];
}

/**
 * Cómo nombrar el sitio de cada centro en tiras y marcadores: la ciudad, o el
 * barrio (nombre sin la marca) si todos los centros están en la misma ciudad.
 */
export function lugaresDeCentros(centros: readonly CentroBasico[]) {
  const mismaCiudad = centros.length > 1 && ciudadesUnicas(centros).length === 1;
  return (c: CentroBasico) => (mismaCiudad ? sinMarca(c.nombre) : c.ciudad);
}

/** Grid de un centro por columna (1-4), con clases estáticas para que Tailwind las genere. */
export const COLUMNAS_CENTROS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export const COLUMNAS_CENTROS_SM: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

export const columnas = (mapa: Record<number, string>, n: number) => mapa[Math.min(Math.max(n, 1), 4)];
