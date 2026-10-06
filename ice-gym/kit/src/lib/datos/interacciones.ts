import "server-only";
import { MARCA } from "@/marca";
import { createClient } from "@/lib/supabase/server";
import {
  SELECT_INTERACCION,
  type EstadoInteraccion,
  type InteraccionCompleta,
  type Miembro,
  type Oportunidad,
  type Prioridad,
  type TipoInteraccion,
} from "@/lib/b2b";

/** Actividades y tareas del CRM B2B (tabla interacciones). */

export type FiltroInteracciones = {
  empresaId?: string;
  contactoId?: string;
  oportunidadId?: string;
  tipos?: TipoInteraccion[];
  estado?: EstadoInteraccion;
  responsableId?: string;
  desde?: string;
  hasta?: string;
  limite?: number;
};

/** "2026-09-24" → fin de ese día; un ISO completo se respeta tal cual. */
const finDeDia = (d: string) => (d.length === 10 ? `${d}T23:59:59.999` : d);

export async function listarInteracciones(f: FiltroInteracciones = {}): Promise<InteraccionCompleta[]> {
  const supabase = await createClient();
  let q = supabase.from("interacciones").select(SELECT_INTERACCION);
  if (f.empresaId) q = q.eq("empresa_id", f.empresaId);
  if (f.contactoId) q = q.eq("contacto_id", f.contactoId);
  if (f.oportunidadId) q = q.eq("oportunidad_id", f.oportunidadId);
  if (f.tipos?.length) q = q.in("tipo", f.tipos);
  if (f.estado) q = q.eq("estado", f.estado);
  if (f.responsableId) q = q.eq("responsable_id", f.responsableId);
  if (f.desde) q = q.gte("fecha", f.desde);
  if (f.hasta) q = q.lte("fecha", finDeDia(f.hasta));
  const { data } = await q
    .order("fecha", { ascending: false })
    .limit(f.limite ?? 200)
    .returns<InteraccionCompleta[]>();
  return data ?? [];
}

export const TIPOS_TAREA = ["tarea", "seguimiento"] as const satisfies readonly TipoInteraccion[];

export type FiltroTareas = {
  responsableId?: string;
  prioridad?: Prioridad;
  empresaId?: string;
  contactoId?: string;
  oportunidadId?: string;
  /** Cuántas completadas/canceladas traer (las más recientes). Por defecto 60. */
  limiteCerradas?: number;
};

/**
 * Tareas y seguimientos: todas las pendientes (orden por fecha ascendente,
 * lo más urgente primero) y las últimas cerradas.
 */
export async function listarTareas(f: FiltroTareas = {}): Promise<InteraccionCompleta[]> {
  const supabase = await createClient();
  const base = () => {
    let q = supabase.from("interacciones").select(SELECT_INTERACCION).in("tipo", TIPOS_TAREA);
    if (f.responsableId) q = q.eq("responsable_id", f.responsableId);
    if (f.prioridad) q = q.eq("prioridad", f.prioridad);
    if (f.empresaId) q = q.eq("empresa_id", f.empresaId);
    if (f.contactoId) q = q.eq("contacto_id", f.contactoId);
    if (f.oportunidadId) q = q.eq("oportunidad_id", f.oportunidadId);
    return q;
  };
  const [pendientes, cerradas] = await Promise.all([
    base().eq("estado", "pendiente").order("fecha", { ascending: true }).limit(500).returns<InteraccionCompleta[]>(),
    base()
      .neq("estado", "pendiente")
      .order("completada_at", { ascending: false, nullsFirst: false })
      .order("fecha", { ascending: false })
      .limit(f.limiteCerradas ?? 60)
      .returns<InteraccionCompleta[]>(),
  ]);
  return [...(pendientes.data ?? []), ...(cerradas.data ?? [])];
}

/** Tareas y seguimientos pendientes (para contadores de navegación y cabeceras). */
export async function contarTareasPendientes(responsableId?: string): Promise<number> {
  const supabase = await createClient();
  let q = supabase
    .from("interacciones")
    .select("id", { count: "exact", head: true })
    .in("tipo", TIPOS_TAREA)
    .eq("estado", "pendiente");
  if (responsableId) q = q.eq("responsable_id", responsableId);
  const { count } = await q;
  return count ?? 0;
}

export type OpcionOportunidad = Pick<Oportunidad, "id" | "nombre" | "empresa_id" | "contacto_id">;

/** Oportunidades para los selectores de relación (abiertas primero). */
export async function opcionesOportunidades(): Promise<OpcionOportunidad[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("oportunidades")
    .select("id, nombre, empresa_id, contacto_id, estado")
    .order("estado")
    .order("nombre")
    .limit(500)
    .returns<(OpcionOportunidad & { estado: string })[]>();
  return (data ?? []).map(({ id, nombre, empresa_id, contacto_id }) => ({ id, nombre, empresa_id, contacto_id }));
}

/** Lunes 00:00 (hora de Madrid, aprox. por el desfase actual) de la semana en curso, en ISO. */
export function inicioSemana(ahora = new Date()) {
  const madrid = new Date(ahora.toLocaleString("en-US", { timeZone: MARCA.zonaHoraria }));
  const desfase = madrid.getTime() - ahora.getTime();
  const dia = (madrid.getDay() + 6) % 7; // 0 = lunes
  madrid.setHours(0, 0, 0, 0);
  madrid.setDate(madrid.getDate() - dia);
  return new Date(madrid.getTime() - desfase).toISOString();
}

export type ResumenActividad = {
  semana: Record<TipoInteraccion, number>;
  totalSemana: number;
  proximos: number;
  vencidas: number;
};

/** KPIs de la pantalla de actividades: lo registrado esta semana y lo que viene. */
export async function resumenActividad(): Promise<ResumenActividad> {
  const supabase = await createClient();
  const ahora = new Date();
  const en7 = new Date(ahora.getTime() + 7 * 86_400_000).toISOString();
  const [semana, proximos, vencidas] = await Promise.all([
    supabase.from("interacciones").select("tipo").gte("fecha", inicioSemana(ahora)).lte("fecha", ahora.toISOString()).limit(5000),
    supabase
      .from("interacciones")
      .select("id", { count: "exact", head: true })
      .in("tipo", TIPOS_TAREA)
      .eq("estado", "pendiente")
      .gte("fecha", ahora.toISOString())
      .lte("fecha", en7),
    supabase
      .from("interacciones")
      .select("id", { count: "exact", head: true })
      .in("tipo", TIPOS_TAREA)
      .eq("estado", "pendiente")
      .lt("fecha", ahora.toISOString()),
  ]);
  const cuenta = { llamada: 0, email: 0, reunion: 0, nota: 0, tarea: 0, seguimiento: 0, cambio_etapa: 0 } as Record<TipoInteraccion, number>;
  for (const f of (semana.data ?? []) as { tipo: TipoInteraccion }[]) cuenta[f.tipo] = (cuenta[f.tipo] ?? 0) + 1;
  return {
    semana: cuenta,
    totalSemana: (semana.data ?? []).length,
    proximos: proximos.count ?? 0,
    vencidas: vencidas.count ?? 0,
  };
}

/** Usuario con sesión y su ficha en `equipo` (por email), si la tiene. */
export async function usuarioActual() {
  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getClaims();
  const email = (sesion?.claims.email as string | undefined) ?? null;
  if (!email) return { email: null, miembro: null as Miembro | null };
  const { data } = await supabase.from("equipo").select("*").ilike("email", email).maybeSingle<Miembro>();
  return { email, miembro: data ?? null };
}
