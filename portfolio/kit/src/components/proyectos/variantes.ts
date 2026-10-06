// Plain module (no "use client") so the server page can validate ?proyectos= before rendering.
export const VARIANTES = [
  { id: "apilado", nombre: "Apilado" },
  { id: "indice", nombre: "Índice fijo" },
  { id: "carrete", nombre: "Carrete" },
  { id: "cortina", nombre: "Cortina" },
  { id: "rejilla", nombre: "Rejilla" },
  { id: "helice", nombre: "Hélice 3D" },
] as const;

export type VarianteId = (typeof VARIANTES)[number]["id"];

export const esVariante = (v: unknown): v is VarianteId => VARIANTES.some((x) => x.id === v);
