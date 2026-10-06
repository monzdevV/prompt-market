import { ESTADOS_CONTACTO, TIPOS_CONTACTO, TIPOS_EMPRESA, incluye, type EstadoContacto, type TipoContacto, type TipoEmpresa } from "@/lib/b2b";

/** Filtros del listado de contactos: viven en la URL (searchParams). Puro: vale en servidor y cliente. */

export const VISTAS_CONTACTOS = ["tabla", "tarjetas"] as const;
export type VistaContactos = (typeof VISTAS_CONTACTOS)[number];

export const ORDENES_CONTACTOS = {
  nombre: "Nombre",
  empresa: "Empresa",
  oportunidades: "Nº oportunidades",
  actividad: "Última actividad",
  alta: "Fecha de alta",
} as const;
export type OrdenContactos = keyof typeof ORDENES_CONTACTOS;

export type FiltrosContactos = {
  vista: VistaContactos;
  q: string;
  empresa: string; // id o ""
  tipoEmpresa: "" | TipoEmpresa;
  tipo: "" | TipoContacto;
  estado: "" | EstadoContacto;
  responsable: string; // id, "ninguno" o ""
  principal: "" | "si" | "no";
  pais: string;
  orden: OrdenContactos;
  dir: "asc" | "desc";
};

export const FILTROS_DEFECTO: FiltrosContactos = {
  vista: "tabla",
  q: "",
  empresa: "",
  tipoEmpresa: "",
  tipo: "",
  estado: "",
  responsable: "",
  principal: "",
  pais: "",
  orden: "nombre",
  dir: "asc",
};

/** Dirección natural de cada orden: A→Z en textos, más reciente/más primero en cifras. */
export const DIR_NATURAL: Record<OrdenContactos, "asc" | "desc"> = {
  nombre: "asc",
  empresa: "asc",
  oportunidades: "desc",
  actividad: "desc",
  alta: "desc",
};

type Entrada = URLSearchParams | Record<string, string | string[] | undefined>;

function valor(p: Entrada, k: string) {
  if (p instanceof URLSearchParams) return p.get(k) ?? "";
  const v = p[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function leerFiltrosContactos(p: Entrada): FiltrosContactos {
  const vista = valor(p, "vista");
  const tipoEmpresa = valor(p, "tipoEmpresa");
  const tipo = valor(p, "tipo");
  const estado = valor(p, "estado");
  const principal = valor(p, "principal");
  const orden = valor(p, "orden");
  const ordenOk = orden in ORDENES_CONTACTOS ? (orden as OrdenContactos) : FILTROS_DEFECTO.orden;
  const dir = valor(p, "dir");
  return {
    vista: incluye(VISTAS_CONTACTOS, vista) ? vista : "tabla",
    q: valor(p, "q").slice(0, 80),
    empresa: /^[0-9a-f-]{36}$/i.test(valor(p, "empresa")) ? valor(p, "empresa") : "",
    tipoEmpresa: incluye(TIPOS_EMPRESA, tipoEmpresa) ? tipoEmpresa : "",
    tipo: incluye(TIPOS_CONTACTO, tipo) ? tipo : "",
    estado: incluye(ESTADOS_CONTACTO, estado) ? estado : "",
    responsable: valor(p, "responsable").slice(0, 40),
    principal: principal === "si" || principal === "no" ? principal : "",
    pais: valor(p, "pais").slice(0, 60),
    orden: ordenOk,
    dir: dir === "asc" || dir === "desc" ? dir : DIR_NATURAL[ordenOk],
  };
}

export const hayFiltrosActivos = (f: FiltrosContactos) =>
  !!(f.q || f.empresa || f.tipoEmpresa || f.tipo || f.estado || f.responsable || f.principal || f.pais);
