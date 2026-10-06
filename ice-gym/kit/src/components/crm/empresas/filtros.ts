import {
  ESTADOS_EMPRESA,
  TIPOS_EMPRESA,
  incluye,
  type EstadoEmpresa,
  type TipoEmpresa,
} from "@/lib/b2b";

/** Filtros del listado de empresas (en la URL). Válido en servidor y en cliente. */

/* ------------------------------- Filtros ------------------------------- */

export const ORDENES_EMPRESA = {
  nombre: "Nombre",
  valor: "Valor total",
  oportunidades: "Nº oportunidades",
  creacion: "Fecha de creación",
  actividad: "Última actividad",
} as const;
export type OrdenEmpresa = keyof typeof ORDENES_EMPRESA;

export const RANGOS_OPORTUNIDADES = { "0": "Sin oportunidades", "1-2": "1 a 2", "3+": "3 o más" } as const;
export type RangoOportunidades = keyof typeof RANGOS_OPORTUNIDADES;

export const VISTAS_EMPRESA = ["tabla", "tarjetas"] as const;
export type VistaEmpresa = (typeof VISTAS_EMPRESA)[number];

export type FiltrosEmpresas = {
  q: string;
  tipo: "todos" | TipoEmpresa;
  sector: string; // "todos" o un sector
  responsable: string; // "todos", "nadie" o id
  estado: "todos" | EstadoEmpresa;
  ops: "todas" | RangoOportunidades;
  orden: OrdenEmpresa;
  dir: "asc" | "desc";
  vista: VistaEmpresa;
};

export const FILTROS_DEFECTO: FiltrosEmpresas = {
  q: "",
  tipo: "todos",
  sector: "todos",
  responsable: "todos",
  estado: "todos",
  ops: "todas",
  orden: "nombre",
  dir: "asc",
  vista: "tabla",
};

/** Dirección natural de cada orden (el nombre de la A a la Z; el resto, de mayor a menor). */
export const DIR_NATURAL: Record<OrdenEmpresa, "asc" | "desc"> = {
  nombre: "asc",
  valor: "desc",
  oportunidades: "desc",
  creacion: "desc",
  actividad: "desc",
};

type Params = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function leerFiltrosEmpresas(p: Params): FiltrosEmpresas {
  const tipo = uno(p.tipo);
  const estado = uno(p.estado);
  const ops = uno(p.ops);
  const orden = uno(p.orden);
  const dir = uno(p.dir);
  const vista = uno(p.vista);
  const ordenOk: OrdenEmpresa = orden in ORDENES_EMPRESA ? (orden as OrdenEmpresa) : "nombre";
  return {
    q: uno(p.q).slice(0, 80),
    tipo: incluye(TIPOS_EMPRESA, tipo) ? tipo : "todos",
    sector: uno(p.sector) || "todos",
    responsable: uno(p.responsable) || "todos",
    estado: incluye(ESTADOS_EMPRESA, estado) ? estado : "todos",
    ops: ops in RANGOS_OPORTUNIDADES ? (ops as RangoOportunidades) : "todas",
    orden: ordenOk,
    dir: dir === "asc" || dir === "desc" ? dir : DIR_NATURAL[ordenOk],
    vista: incluye(VISTAS_EMPRESA, vista) ? vista : "tabla",
  };
}

