/* ------------------------------- Leads -------------------------------- */

export const ESTADOS_LEAD = [
  "nuevo",
  "contactado",
  "visita_agendada",
  "en_prueba",
  "convertido",
  "perdido",
] as const;

export type EstadoLead = (typeof ESTADOS_LEAD)[number];

export const ETIQUETA_LEAD: Record<EstadoLead, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  visita_agendada: "Visita agendada",
  en_prueba: "En prueba",
  convertido: "Convertido",
  perdido: "Perdido",
};

/** De etapa temprana (poco contraste) a avanzada (mucho). Perdido queda apagado. */
export const COLOR_LEAD: Record<EstadoLead, string> = {
  nuevo: "var(--rampa-0)",
  contactado: "var(--rampa-1)",
  visita_agendada: "var(--rampa-2)",
  en_prueba: "var(--rampa-3)",
  convertido: "var(--rampa-5)",
  perdido: "var(--apagado)",
};

/** Probabilidad de cierre por defecto de cada etapa, en %. */
export const PROBABILIDAD_ETAPA: Record<EstadoLead, number> = {
  nuevo: 10,
  contactado: 25,
  visita_agendada: 50,
  en_prueba: 75,
  convertido: 100,
  perdido: 0,
};

/** Etapas en las que el lead sigue vivo. */
export const ETAPAS_ABIERTAS = ["nuevo", "contactado", "visita_agendada", "en_prueba"] as const;

export function esAbierto(estado: EstadoLead) {
  return (ETAPAS_ABIERTAS as readonly string[]).includes(estado);
}

/** Tono de etiqueta (var CSS) de cada etapa. */
export const TONO_LEAD: Record<EstadoLead, string> = {
  nuevo: "var(--relleno-azul)",
  contactado: "var(--relleno-violeta)",
  visita_agendada: "var(--relleno-ambar)",
  en_prueba: "var(--relleno-rosa)",
  convertido: "var(--relleno-verde)",
  perdido: "var(--relleno-gris)",
};

export const ORIGENES_LEAD = ["web", "visita", "telefono", "recomendacion", "campana"] as const;
export type OrigenLead = (typeof ORIGENES_LEAD)[number];

export const ETIQUETA_ORIGEN: Record<OrigenLead, string> = {
  web: "Web",
  visita: "Visita al club",
  telefono: "Teléfono",
  recomendacion: "Recomendación",
  campana: "Campaña",
};

export const TONO_ORIGEN: Record<OrigenLead, string> = {
  web: "var(--relleno-azul)",
  visita: "var(--relleno-verde)",
  telefono: "var(--relleno-violeta)",
  recomendacion: "var(--relleno-ambar)",
  campana: "var(--relleno-rosa)",
};

export function esOrigenLead(valor: unknown): valor is OrigenLead {
  return typeof valor === "string" && (ORIGENES_LEAD as readonly string[]).includes(valor);
}

/* ------------------------------- Socios ------------------------------- */

export const ESTADOS_SOCIO = ["activo", "congelado", "impago", "baja"] as const;
export type EstadoSocio = (typeof ESTADOS_SOCIO)[number];

export const ETIQUETA_SOCIO: Record<EstadoSocio, string> = {
  activo: "Activo",
  congelado: "Congelado",
  impago: "Impago",
  baja: "Baja",
};

/** Placa del dorsal según el estado. Sólo el impago usa el rojo. */
export const COLOR_SOCIO: Record<EstadoSocio, { fondo: string; texto: string }> = {
  activo: { fondo: "var(--tinta)", texto: "var(--fondo)" },
  congelado: { fondo: "var(--placa-2)", texto: "var(--tinta-2)" },
  impago: { fondo: "var(--alarma)", texto: "var(--sobre-campo)" },
  baja: { fondo: "transparent", texto: "var(--tinta-2)" },
};

/* ------------------------------- Pagos -------------------------------- */

export const ESTADOS_PAGO = ["pagado", "pendiente", "impagado"] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  impagado: "Impagado",
};

/* ----------------------------- Actividades ---------------------------- */

export const TIPOS_ACTIVIDAD = [
  "llamada",
  "email",
  "whatsapp",
  "visita",
  "nota",
  "cambio_estado",
] as const;
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export const ETIQUETA_ACTIVIDAD: Record<TipoActividad, string> = {
  llamada: "Llamada",
  email: "Email",
  whatsapp: "WhatsApp",
  visita: "Visita",
  nota: "Nota",
  cambio_estado: "Cambio de estado",
};

/** Las que puede registrar una persona a mano. El cambio de estado lo anota el sistema. */
export const TIPOS_ACTIVIDAD_MANUAL = ["llamada", "email", "whatsapp", "visita", "nota"] as const;

/* ------------------------------- Filas -------------------------------- */

export type Centro = {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string;
  direccion: string;
  telefono: string | null;
  aforo: number;
  horario: string | null;
  activo: boolean;
};

export type Tarifa = {
  id: string;
  nombre: string;
  slug: string;
  cuota_mensual: number;
  matricula: number;
  descripcion: string | null;
  incluye: string[];
  destacada: boolean;
  orden: number;
  activa: boolean;
};

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  nombre: string;
  email: string;
  telefono: string | null;
  mensaje: string | null;
  notas: string | null;
  origen: OrigenLead;
  estado: EstadoLead;
  centro_id: string | null;
  tarifa_interes_id: string | null;
  socio_id: string | null;
  fecha_visita: string | null;
  motivo_perdida: string | null;
  valor_estimado: number | null;
  probabilidad: number | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  etiquetas: string[];
};

export type Socio = {
  id: string;
  created_at: string;
  updated_at: string;
  numero_socio: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
  centro_id: string;
  tarifa_id: string;
  fecha_alta: string;
  fecha_baja: string | null;
  estado: EstadoSocio;
  notas: string | null;
};

export type Pago = {
  id: string;
  created_at: string;
  socio_id: string;
  periodo: string;
  concepto: "cuota" | "matricula";
  importe: number;
  fecha_emision: string;
  fecha_pago: string | null;
  estado: EstadoPago;
  metodo: "domiciliacion" | "tarjeta" | "efectivo" | null;
};

export type Acceso = {
  id: string;
  socio_id: string;
  centro_id: string;
  entrada: string;
  salida: string | null;
};

export type Clase = {
  id: string;
  centro_id: string;
  nombre: string;
  disciplina: string;
  monitor: string;
  sala: string | null;
  inicio: string;
  duracion_min: number;
  plazas: number;
  nivel: "todos" | "iniciacion" | "avanzado";
};

export type Actividad = {
  id: string;
  created_at: string;
  lead_id: string | null;
  socio_id: string | null;
  tipo: TipoActividad;
  descripcion: string;
  creado_por: string | null;
};

/* ----------------------------- Utilidades ----------------------------- */

export function esEstadoLead(valor: unknown): valor is EstadoLead {
  return typeof valor === "string" && (ESTADOS_LEAD as readonly string[]).includes(valor);
}

export function esEstadoSocio(valor: unknown): valor is EstadoSocio {
  return typeof valor === "string" && (ESTADOS_SOCIO as readonly string[]).includes(valor);
}
