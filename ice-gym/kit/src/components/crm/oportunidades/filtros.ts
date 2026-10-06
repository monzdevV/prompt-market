import {
  ETAPAS,
  PRIORIDADES,
  TIPOS_OPORTUNIDAD,
  esEtapa,
  incluye,
  type Etapa,
  type Prioridad,
  type TipoOportunidad,
} from "@/lib/b2b";

/**
 * Filtros de /crm/oportunidades. Viven en la URL (searchParams) para poder
 * compartir y recargar la vista. Puro: vale en servidor y en cliente.
 */

export const VISTAS = ["kanban", "tabla"] as const;
export type Vista = (typeof VISTAS)[number];

export const CAMPOS_FECHA = { creacion: "Creación", cierre: "Cierre" } as const;
export type CampoFecha = keyof typeof CAMPOS_FECHA;

export const COLUMNAS_ORDEN = {
  nombre: "Nombre",
  empresa: "Empresa",
  tipo: "Tipo",
  etapa: "Etapa",
  valor: "Valor",
  probabilidad: "Probabilidad",
  responsable: "Responsable",
  prioridad: "Prioridad",
  cierre: "Cierre",
  accion: "Próxima acción",
  creada: "Creada",
} as const;
export type Orden = keyof typeof COLUMNAS_ORDEN;

export type FiltroEtapa = "todas" | "abiertas" | Etapa;

export type FiltrosOportunidad = {
  vista: Vista;
  q: string;
  empresa: string;
  contacto: string;
  tipo: "" | TipoOportunidad;
  etapa: FiltroEtapa;
  responsable: string; // id | "sin" | ""
  prioridad: "" | Prioridad;
  fecha: CampoFecha;
  desde: string; // YYYY-MM-DD
  hasta: string;
  vmin: string;
  vmax: string;
  orden: Orden;
  dir: "asc" | "desc";
};

/** Valores por defecto: no se escriben en la URL. */
export const DEFECTO: FiltrosOportunidad = {
  vista: "kanban",
  q: "",
  empresa: "",
  contacto: "",
  tipo: "",
  etapa: "todas",
  responsable: "",
  prioridad: "",
  fecha: "creacion",
  desde: "",
  hasta: "",
  vmin: "",
  vmax: "",
  orden: "creada",
  dir: "desc",
};

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUIDISH = /^[0-9a-f-]{8,40}$/i;
const NUMERO = /^\d+(\.\d+)?$/;

type Lector = (clave: string) => string | null | undefined;

/** Lee filtros de URLSearchParams o del objeto searchParams de una página. */
export function leerFiltros(fuente: URLSearchParams | Record<string, string | string[] | undefined>): FiltrosOportunidad {
  const get: Lector =
    fuente instanceof URLSearchParams
      ? (k) => fuente.get(k)
      : (k) => {
          const v = fuente[k];
          return Array.isArray(v) ? v[0] : v;
        };
  const t = (k: string) => (get(k) ?? "").trim();

  const vista = t("vista");
  const tipo = t("tipo");
  const etapa = t("etapa");
  const prioridad = t("prioridad");
  const fecha = t("fecha");
  const orden = t("orden");
  const responsable = t("responsable");

  return {
    vista: incluye(VISTAS, vista) ? vista : DEFECTO.vista,
    q: t("q").slice(0, 80),
    empresa: UUIDISH.test(t("empresa")) ? t("empresa") : "",
    contacto: UUIDISH.test(t("contacto")) ? t("contacto") : "",
    tipo: incluye(TIPOS_OPORTUNIDAD, tipo) ? tipo : "",
    etapa: etapa === "abiertas" || esEtapa(etapa) ? etapa : "todas",
    responsable: responsable === "sin" || UUIDISH.test(responsable) ? responsable : "",
    prioridad: incluye(PRIORIDADES, prioridad) ? prioridad : "",
    fecha: fecha in CAMPOS_FECHA ? (fecha as CampoFecha) : DEFECTO.fecha,
    desde: FECHA_ISO.test(t("desde")) ? t("desde") : "",
    hasta: FECHA_ISO.test(t("hasta")) ? t("hasta") : "",
    vmin: NUMERO.test(t("vmin")) ? t("vmin") : "",
    vmax: NUMERO.test(t("vmax")) ? t("vmax") : "",
    orden: orden in COLUMNAS_ORDEN ? (orden as Orden) : DEFECTO.orden,
    dir: t("dir") === "asc" ? "asc" : "desc",
  };
}

/** Número de filtros de datos activos (sin contar vista ni orden). */
export function cuantosFiltros(f: FiltrosOportunidad) {
  return [f.q, f.empresa, f.contacto, f.tipo, f.etapa !== "todas", f.responsable, f.prioridad, f.desde || f.hasta, f.vmin || f.vmax].filter(
    Boolean
  ).length;
}

/** Columnas que pinta el Kanban según el filtro de etapa. */
export function etapasVisibles(etapa: FiltroEtapa): Etapa[] {
  if (etapa === "todas") return [...ETAPAS];
  if (etapa === "abiertas") return ETAPAS.filter((e) => e !== "ganada" && e !== "perdida");
  return [etapa];
}

export function normalizar(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
