/**
 * CRM B2B: empresas → contactos → oportunidades → interacciones (actividades y tareas).
 * Tipos, catálogos y cálculos puros; valen en servidor y en cliente.
 * Tablas Supabase: equipo, empresas, contactos, oportunidades, interacciones.
 */

type Catalogo<T extends string> = Record<T, string>;

/* ------------------------------- Equipo -------------------------------- */

export const COLORES_EQUIPO = ["azul", "violeta", "ambar", "rosa", "verde", "gris"] as const;
export type ColorEquipo = (typeof COLORES_EQUIPO)[number];

export type Miembro = {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  puesto: string | null;
  color: ColorEquipo;
  activo: boolean;
};

export const tonoColor = (c: ColorEquipo | string | null | undefined) => `var(--relleno-${c ?? "gris"})`;

/* ------------------------------ Empresas ------------------------------- */

export const TIPOS_EMPRESA = ["cliente", "proveedor", "partner", "prospecto", "distribuidor", "fabricante", "colaborador"] as const;
export type TipoEmpresa = (typeof TIPOS_EMPRESA)[number];
export const ETIQUETA_TIPO_EMPRESA: Catalogo<TipoEmpresa> = {
  cliente: "Cliente",
  proveedor: "Proveedor",
  partner: "Partner",
  prospecto: "Prospecto",
  distribuidor: "Distribuidor",
  fabricante: "Fabricante",
  colaborador: "Colaborador",
};
export const TONO_TIPO_EMPRESA: Catalogo<TipoEmpresa> = {
  cliente: "var(--relleno-verde)",
  proveedor: "var(--relleno-azul)",
  partner: "var(--relleno-violeta)",
  prospecto: "var(--relleno-gris)",
  distribuidor: "var(--relleno-ambar)",
  fabricante: "var(--relleno-rosa)",
  colaborador: "var(--relleno-violeta)",
};

export const SECTORES = [
  "fitness",
  "maquinaria",
  "agua",
  "bebidas",
  "alimentacion",
  "tecnologia",
  "logistica",
  "mantenimiento",
  "limpieza",
  "textil",
  "salud",
  "consultoria",
  "marketing",
  "financiero",
  "hosteleria",
  "retail",
  "educacion",
  "otros",
] as const;
export type Sector = (typeof SECTORES)[number];
export const ETIQUETA_SECTOR: Catalogo<Sector> = {
  fitness: "Fitness y deporte",
  maquinaria: "Maquinaria",
  agua: "Agua",
  bebidas: "Bebidas",
  alimentacion: "Alimentación y suplementos",
  tecnologia: "Tecnología",
  logistica: "Logística",
  mantenimiento: "Mantenimiento",
  limpieza: "Limpieza",
  textil: "Textil y merchandising",
  salud: "Salud y fisioterapia",
  consultoria: "Consultoría",
  marketing: "Marketing",
  financiero: "Financiero y seguros",
  hosteleria: "Hostelería",
  retail: "Retail",
  educacion: "Educación",
  otros: "Otros",
};
export const etiquetaSector = (s: string) => ETIQUETA_SECTOR[s as Sector] ?? s;

export const ESTADOS_EMPRESA = ["activa", "en_evaluacion", "inactiva", "bloqueada"] as const;
export type EstadoEmpresa = (typeof ESTADOS_EMPRESA)[number];
export const ETIQUETA_ESTADO_EMPRESA: Catalogo<EstadoEmpresa> = {
  activa: "Activa",
  en_evaluacion: "En evaluación",
  inactiva: "Inactiva",
  bloqueada: "Bloqueada",
};
export const TONO_ESTADO_EMPRESA: Catalogo<EstadoEmpresa> = {
  activa: "var(--relleno-verde)",
  en_evaluacion: "var(--relleno-ambar)",
  inactiva: "var(--relleno-gris)",
  bloqueada: "var(--relleno-rojo)",
};

export type Empresa = {
  id: string;
  created_at: string;
  updated_at: string;
  nombre: string;
  tipo: TipoEmpresa;
  sector: string;
  web: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string;
  cif: string | null;
  descripcion: string | null;
  notas: string | null;
  logo_url: string | null;
  estado: EstadoEmpresa;
  responsable_id: string | null;
};

/* ------------------------------ Contactos ------------------------------ */

export const TIPOS_CONTACTO = ["decisor", "comercial", "compras", "tecnico", "financiero", "direccion", "operaciones", "otro"] as const;
export type TipoContacto = (typeof TIPOS_CONTACTO)[number];
export const ETIQUETA_TIPO_CONTACTO: Catalogo<TipoContacto> = {
  decisor: "Decisor",
  comercial: "Comercial",
  compras: "Compras",
  tecnico: "Técnico",
  financiero: "Financiero",
  direccion: "Dirección",
  operaciones: "Operaciones",
  otro: "Otro",
};

export const ESTADOS_CONTACTO = ["activo", "inactivo"] as const;
export type EstadoContacto = (typeof ESTADOS_CONTACTO)[number];
export const ETIQUETA_ESTADO_CONTACTO: Catalogo<EstadoContacto> = { activo: "Activo", inactivo: "Inactivo" };

export type Contacto = {
  id: string;
  created_at: string;
  updated_at: string;
  empresa_id: string | null;
  nombre: string;
  apellidos: string;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  linkedin: string | null;
  ciudad: string | null;
  pais: string;
  avatar_url: string | null;
  tipo: TipoContacto;
  rol: string | null;
  principal: boolean;
  estado: EstadoContacto;
  responsable_id: string | null;
  notas: string | null;
};

export const nombreCompleto = (c: { nombre: string; apellidos?: string | null }) =>
  `${c.nombre} ${c.apellidos ?? ""}`.trim();

/* ---------------------------- Oportunidades ---------------------------- */

export const ETAPAS = ["prospeccion", "cualificacion", "propuesta", "negociacion", "ganada", "perdida"] as const;
export type Etapa = (typeof ETAPAS)[number];
export const ETAPAS_ABIERTAS_B2B = ["prospeccion", "cualificacion", "propuesta", "negociacion"] as const;
export const esEtapaAbierta = (e: Etapa) => (ETAPAS_ABIERTAS_B2B as readonly string[]).includes(e);
export const esEtapa = (v: unknown): v is Etapa => typeof v === "string" && (ETAPAS as readonly string[]).includes(v);

export const ETIQUETA_ETAPA: Catalogo<Etapa> = {
  prospeccion: "Prospección",
  cualificacion: "Cualificación",
  propuesta: "Propuesta",
  negociacion: "Negociación",
  ganada: "Ganada",
  perdida: "Perdida",
};
/** Marca de etapa (puntos, barras, progreso): tono apagado pero visible. */
export const TONO_ETAPA: Catalogo<Etapa> = {
  prospeccion: "var(--tag-gris)",
  cualificacion: "var(--tag-azul)",
  propuesta: "var(--tag-violeta)",
  negociacion: "var(--tag-cian)",
  ganada: "var(--tag-verde)",
  perdida: "var(--critico)",
};
/** Fondo pastel de la etiqueta de etapa (texto oscuro encima). */
export const RELLENO_ETAPA: Catalogo<Etapa> = {
  prospeccion: "var(--relleno-gris)",
  cualificacion: "var(--relleno-azul)",
  propuesta: "var(--relleno-violeta)",
  negociacion: "var(--relleno-cian)",
  ganada: "var(--relleno-verde)",
  perdida: "var(--relleno-rojo)",
};
/** Probabilidad por defecto de cada etapa, en %. */
export const PROBABILIDAD_POR_ETAPA: Record<Etapa, number> = {
  prospeccion: 10,
  cualificacion: 25,
  propuesta: 50,
  negociacion: 75,
  ganada: 100,
  perdida: 0,
};

export const TIPOS_OPORTUNIDAD = [
  "venta_cliente",
  "compra_proveedor",
  "proveedor_maquinaria",
  "proveedor_agua",
  "proveedor_bebidas",
  "proveedor_productos",
  "proveedor_tecnologia",
  "servicios_profesionales",
  "colaboracion",
  "distribucion",
  "partnership",
  "otros",
] as const;
export type TipoOportunidad = (typeof TIPOS_OPORTUNIDAD)[number];
export const ETIQUETA_TIPO_OPORTUNIDAD: Catalogo<TipoOportunidad> = {
  venta_cliente: "Venta a cliente",
  compra_proveedor: "Compra a proveedor",
  proveedor_maquinaria: "Proveedor de maquinaria",
  proveedor_agua: "Proveedor de agua",
  proveedor_bebidas: "Proveedor de bebidas",
  proveedor_productos: "Proveedor de productos",
  proveedor_tecnologia: "Proveedor de tecnología",
  servicios_profesionales: "Servicios profesionales",
  colaboracion: "Colaboración comercial",
  distribucion: "Distribución",
  partnership: "Partnership",
  otros: "Otros",
};
/** Dirección del dinero: venta (entra), compra (sale) o alianza. */
export const DIRECCION_TIPO: Record<TipoOportunidad, "venta" | "compra" | "alianza"> = {
  venta_cliente: "venta",
  compra_proveedor: "compra",
  proveedor_maquinaria: "compra",
  proveedor_agua: "compra",
  proveedor_bebidas: "compra",
  proveedor_productos: "compra",
  proveedor_tecnologia: "compra",
  servicios_profesionales: "compra",
  colaboracion: "alianza",
  distribucion: "alianza",
  partnership: "alianza",
  otros: "alianza",
};
export const TONO_DIRECCION = {
  venta: "var(--relleno-cian)",
  compra: "var(--relleno-azul)",
  alianza: "var(--relleno-violeta)",
} as const;
export const tonoTipoOportunidad = (t: TipoOportunidad) => TONO_DIRECCION[DIRECCION_TIPO[t]];

export const PRIORIDADES = ["baja", "media", "alta", "urgente"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];
export const ETIQUETA_PRIORIDAD: Catalogo<Prioridad> = { baja: "Baja", media: "Media", alta: "Alta", urgente: "Urgente" };
export const TONO_PRIORIDAD: Catalogo<Prioridad> = {
  baja: "var(--relleno-gris)",
  media: "var(--relleno-azul)",
  alta: "var(--relleno-ambar)",
  urgente: "var(--relleno-rojo)",
};

export const ESTADOS_OPORTUNIDAD = ["abierta", "en_pausa", "ganada", "perdida"] as const;
export type EstadoOportunidad = (typeof ESTADOS_OPORTUNIDAD)[number];
export const ETIQUETA_ESTADO_OPORTUNIDAD: Catalogo<EstadoOportunidad> = {
  abierta: "Abierta",
  en_pausa: "En pausa",
  ganada: "Ganada",
  perdida: "Perdida",
};

export const ORIGENES = ["web", "referido", "evento", "llamada_fria", "email", "linkedin", "feria", "partner", "inbound", "otro"] as const;
export type Origen = (typeof ORIGENES)[number];
export const ETIQUETA_ORIGEN_B2B: Catalogo<Origen> = {
  web: "Web",
  referido: "Referido",
  evento: "Evento",
  llamada_fria: "Llamada en frío",
  email: "Email",
  linkedin: "LinkedIn",
  feria: "Feria",
  partner: "Partner",
  inbound: "Inbound",
  otro: "Otro",
};

export type Oportunidad = {
  id: string;
  created_at: string;
  updated_at: string;
  nombre: string;
  tipo: TipoOportunidad;
  etapa: Etapa;
  posicion: number;
  valor: number;
  probabilidad: number | null;
  fecha_cierre: string | null;
  prioridad: Prioridad;
  estado: EstadoOportunidad;
  origen: Origen;
  empresa_id: string | null;
  contacto_id: string | null;
  responsable_id: string | null;
  descripcion: string | null;
  necesidad: string | null;
  notas: string | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  motivo_perdida: string | null;
};

/** Estado coherente con la etapa: las cerradas mandan. */
export function estadoParaEtapa(etapa: Etapa, actual: EstadoOportunidad = "abierta"): EstadoOportunidad {
  if (etapa === "ganada") return "ganada";
  if (etapa === "perdida") return "perdida";
  return actual === "en_pausa" ? "en_pausa" : "abierta";
}

export function probabilidadB2B(o: Pick<Oportunidad, "etapa" | "probabilidad">) {
  if (!esEtapaAbierta(o.etapa)) return PROBABILIDAD_POR_ETAPA[o.etapa];
  return o.probabilidad ?? PROBABILIDAD_POR_ETAPA[o.etapa];
}

export const valorEsperado = (o: Pick<Oportunidad, "etapa" | "probabilidad" | "valor">) =>
  (Number(o.valor) * probabilidadB2B(o)) / 100;

export function accionVencidaB2B(o: Pick<Oportunidad, "proxima_accion_fecha" | "etapa">, ahora = Date.now()) {
  return !!o.proxima_accion_fecha && esEtapaAbierta(o.etapa) && new Date(o.proxima_accion_fecha).getTime() < ahora;
}

/* ---------------------- Interacciones (actividad y tareas) ---------------------- */

export const TIPOS_INTERACCION = ["llamada", "email", "reunion", "nota", "tarea", "seguimiento", "cambio_etapa"] as const;
export type TipoInteraccion = (typeof TIPOS_INTERACCION)[number];
/** Las que registra una persona. El cambio de etapa lo anota el sistema. */
export const TIPOS_INTERACCION_MANUAL = ["llamada", "email", "reunion", "nota", "tarea", "seguimiento"] as const;
export const ETIQUETA_INTERACCION: Catalogo<TipoInteraccion> = {
  llamada: "Llamada",
  email: "Email",
  reunion: "Reunión",
  nota: "Nota",
  tarea: "Tarea",
  seguimiento: "Seguimiento",
  cambio_etapa: "Cambio de etapa",
};
export const TONO_INTERACCION: Catalogo<TipoInteraccion> = {
  llamada: "var(--relleno-cian)",
  email: "var(--relleno-azul)",
  reunion: "var(--relleno-violeta)",
  nota: "var(--relleno-gris)",
  tarea: "var(--relleno-rosa)",
  seguimiento: "var(--relleno-rosa)",
  cambio_etapa: "var(--relleno-gris)",
};

export const ESTADOS_INTERACCION = ["pendiente", "completada", "cancelada"] as const;
export type EstadoInteraccion = (typeof ESTADOS_INTERACCION)[number];
export const ETIQUETA_ESTADO_INTERACCION: Catalogo<EstadoInteraccion> = {
  pendiente: "Pendiente",
  completada: "Completada",
  cancelada: "Cancelada",
};

export type Interaccion = {
  id: string;
  created_at: string;
  tipo: TipoInteraccion;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  estado: EstadoInteraccion;
  prioridad: Prioridad;
  completada_at: string | null;
  responsable_id: string | null;
  empresa_id: string | null;
  contacto_id: string | null;
  oportunidad_id: string | null;
};

/* --------------------------- Filas con relaciones --------------------------- */

export type EmpresaMini = Pick<Empresa, "id" | "nombre" | "tipo" | "sector" | "logo_url">;
export type ContactoMini = Pick<Contacto, "id" | "nombre" | "apellidos" | "cargo" | "email" | "telefono" | "avatar_url" | "empresa_id"> & { principal?: boolean };
export type OportunidadMini = Pick<Oportunidad, "id" | "nombre" | "etapa" | "tipo" | "valor">;
export type MiembroMini = Pick<Miembro, "id" | "nombre" | "apellidos" | "color">;

export type OportunidadCompleta = Oportunidad & {
  empresa: EmpresaMini | null;
  contacto: ContactoMini | null;
  responsable: MiembroMini | null;
};

export type InteraccionCompleta = Interaccion & {
  empresa: Pick<Empresa, "id" | "nombre"> | null;
  contacto: Pick<Contacto, "id" | "nombre" | "apellidos"> | null;
  oportunidad: Pick<Oportunidad, "id" | "nombre"> | null;
  responsable: MiembroMini | null;
};

/** Selects de PostgREST que devuelven esas formas. */
export const SELECT_OPORTUNIDAD =
  "*, empresa:empresas(id, nombre, tipo, sector, logo_url), contacto:contactos(id, nombre, apellidos, cargo, email, telefono, avatar_url, empresa_id), responsable:equipo(id, nombre, apellidos, color)";
export const SELECT_INTERACCION =
  "*, empresa:empresas(id, nombre), contacto:contactos(id, nombre, apellidos), oportunidad:oportunidades(id, nombre), responsable:equipo(id, nombre, apellidos, color)";

/* -------------------------------- Rutas -------------------------------- */

export const ruta = {
  oportunidades: "/crm/oportunidades",
  oportunidad: (id: string) => `/crm/oportunidades/${id}`,
  empresas: "/crm/empresas",
  empresa: (id: string) => `/crm/empresas/${id}`,
  contactos: "/crm/contactos",
  contacto: (id: string) => `/crm/contactos/${id}`,
  actividades: "/crm/actividades",
  tareas: "/crm/tareas",
  configuracion: "/crm/configuracion",
};

export function incluye<T extends string>(lista: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (lista as readonly string[]).includes(v);
}
