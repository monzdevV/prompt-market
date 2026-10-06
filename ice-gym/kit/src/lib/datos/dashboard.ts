import "server-only";
import { MARCA } from "@/marca";
import { createClient } from "@/lib/supabase/server";
import {
  ETAPAS,
  SELECT_INTERACCION,
  SELECT_OPORTUNIDAD,
  esEtapaAbierta,
  nombreCompleto,
  ruta,
  valorEsperado,
  type EmpresaMini,
  type Etapa,
  type InteraccionCompleta,
  type MiembroMini,
  type OportunidadCompleta,
  type Prioridad,
  type TipoInteraccion,
  type TipoOportunidad,
} from "@/lib/b2b";
import { inicioPeriodo, type PeriodoDashboard } from "@/components/crm/dashboard/filtros";

/** Dashboard comercial B2B: todo se calcula en JS sobre las oportunidades. */

const MESES = 9;
const ZONA = MARCA.zonaHoraria;

export type FiltroDashboard = { periodo: PeriodoDashboard; responsableId?: string };

export type Seguimiento = {
  id: string;
  clase: "accion" | "interaccion";
  tipo: TipoInteraccion | null;
  titulo: string;
  fecha: string;
  vencida: boolean;
  prioridad: Prioridad;
  href: string;
  contexto: string | null;
  responsable: MiembroMini | null;
};

export type FilaMes = {
  /** YYYY-MM-01 */
  mes: string;
  creadas: number;
  valorCreado: number;
  ganadas: number;
  perdidas: number;
  valorGanado: number;
  /** Valor abierto al cierre del mes (el actual, a hoy). */
  pipeline: number;
};

export type Dashboard = {
  kpis: {
    abiertas: number;
    valorPipeline: number;
    valorEsperado: number;
    deltaPipeline: number | null;
    ganadas: number;
    valorGanado: number;
    perdidas: number;
    valorPerdido: number;
    conversion: number | null;
    creadasPeriodo: number;
    empresasActivas: number;
    empresasTotal: number;
    contactos: number;
    pendientes: number;
    vencidas: number;
    accionesVencidas: number;
  };
  porEtapa: { etapa: Etapa; n: number; valor: number; esperado: number }[];
  porTipo: { tipo: TipoOportunidad; n: number; valor: number }[];
  porMes: FilaMes[];
  seguimientos: Seguimiento[];
  actividad: InteraccionCompleta[];
  topOportunidades: OportunidadCompleta[];
  topEmpresas: { empresa: EmpresaMini; abiertas: number; valorAbierto: number; valorGanado: number }[];
  equipo: MiembroMini[];
};

const partesMes = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: ZONA });
/** "2026-09" en hora de Madrid. */
const claveMes = (iso: string) => partesMes.format(new Date(iso)).slice(0, 7);

/** Las últimas N claves de mes, de la más antigua a la actual. */
function ultimosMeses(n: number) {
  const [a, m] = claveMes(new Date().toISOString()).split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

/** Fin de mes (exclusivo) como marca de tiempo: el día 1 del siguiente. */
function finDeMes(clave: string) {
  const [a, m] = clave.split("-").map(Number);
  return Date.UTC(a, m, 1);
}

/** Cuándo se cerró: la fecha de cierre si la hay, si no la última modificación. */
const fechaCierre = (o: OportunidadCompleta) => o.fecha_cierre ?? o.updated_at;

const suma = (xs: OportunidadCompleta[], f: (o: OportunidadCompleta) => number = (o) => Number(o.valor)) =>
  xs.reduce((s, o) => s + f(o), 0);

export async function cargarDashboard(f: FiltroDashboard): Promise<Dashboard> {
  const supabase = await createClient();
  const ahora = new Date();
  const ahoraIso = ahora.toISOString();
  const desde = inicioPeriodo(f.periodo, ahora.getTime());
  const resp = f.responsableId;

  let qOpo = supabase.from("oportunidades").select(SELECT_OPORTUNIDAD).order("valor", { ascending: false }).limit(3000);
  let qPend = supabase
    .from("interacciones")
    .select(SELECT_INTERACCION)
    .eq("estado", "pendiente")
    .order("fecha", { ascending: true })
    .limit(500);
  let qRec = supabase
    .from("interacciones")
    .select(SELECT_INTERACCION)
    .neq("estado", "cancelada")
    .neq("estado", "pendiente")
    .lte("fecha", ahoraIso)
    .order("fecha", { ascending: false })
    .limit(8);
  if (resp) {
    qOpo = qOpo.eq("responsable_id", resp);
    qPend = qPend.eq("responsable_id", resp);
    qRec = qRec.eq("responsable_id", resp);
  }

  const [opo, pend, rec, empresas, contactos, equipo] = await Promise.all([
    qOpo.returns<OportunidadCompleta[]>(),
    qPend.returns<InteraccionCompleta[]>(),
    qRec.returns<InteraccionCompleta[]>(),
    supabase.from("empresas").select("id, estado").returns<{ id: string; estado: string }[]>(),
    supabase.from("contactos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("equipo").select("id, nombre, apellidos, color").eq("activo", true).order("nombre").returns<MiembroMini[]>(),
  ]);

  const todas = opo.data ?? [];
  const pendientes = pend.data ?? [];
  const abiertas = todas.filter((o) => esEtapaAbierta(o.etapa));
  const enPeriodo = (iso: string) => !desde || iso >= desde;
  const ganadas = todas.filter((o) => o.etapa === "ganada" && enPeriodo(fechaCierre(o)));
  const perdidas = todas.filter((o) => o.etapa === "perdida" && enPeriodo(fechaCierre(o)));
  const cerradas = ganadas.length + perdidas.length;

  /* ------------------------------ Series por mes ------------------------------ */
  const meses = ultimosMeses(MESES);
  const porMes: FilaMes[] = meses.map((clave) => {
    const fin = finDeMes(clave);
    const creadas = todas.filter((o) => claveMes(o.created_at) === clave);
    const cerradasMes = todas.filter((o) => !esEtapaAbierta(o.etapa) && claveMes(fechaCierre(o)) === clave);
    const vivas = todas.filter(
      (o) =>
        new Date(o.created_at).getTime() < fin &&
        (esEtapaAbierta(o.etapa) || new Date(fechaCierre(o)).getTime() >= fin),
    );
    return {
      mes: `${clave}-01`,
      creadas: creadas.length,
      valorCreado: suma(creadas),
      ganadas: cerradasMes.filter((o) => o.etapa === "ganada").length,
      perdidas: cerradasMes.filter((o) => o.etapa === "perdida").length,
      valorGanado: suma(cerradasMes.filter((o) => o.etapa === "ganada")),
      pipeline: suma(vivas),
    };
  });
  const valorPipeline = suma(abiertas);
  const pipelineMesPasado = porMes.at(-2)?.pipeline ?? 0;
  const deltaPipeline = pipelineMesPasado > 0 ? ((valorPipeline - pipelineMesPasado) / pipelineMesPasado) * 100 : null;

  /* --------------------------- Etapas y tipos --------------------------- */
  const porEtapa = ETAPAS.map((etapa) => {
    const xs = todas.filter(
      (o) => o.etapa === etapa && (esEtapaAbierta(etapa) || enPeriodo(fechaCierre(o))),
    );
    return { etapa, n: xs.length, valor: suma(xs), esperado: suma(xs, valorEsperado) };
  });

  const tipos = new Map<TipoOportunidad, { n: number; valor: number }>();
  for (const o of abiertas) {
    const t = tipos.get(o.tipo) ?? { n: 0, valor: 0 };
    t.n += 1;
    t.valor += Number(o.valor);
    tipos.set(o.tipo, t);
  }
  const porTipo = [...tipos.entries()]
    .map(([tipo, v]) => ({ tipo, ...v }))
    .sort((a, b) => b.valor - a.valor || b.n - a.n);

  /* ------------------------------ Seguimientos ------------------------------ */
  const ahoraMs = ahora.getTime();
  const acciones: Seguimiento[] = abiertas
    .filter((o) => o.proxima_accion_fecha)
    .map((o) => ({
      id: `o-${o.id}`,
      clase: "accion",
      tipo: null,
      titulo: o.proxima_accion || "Próxima acción",
      fecha: o.proxima_accion_fecha!,
      vencida: new Date(o.proxima_accion_fecha!).getTime() < ahoraMs,
      prioridad: o.prioridad,
      href: ruta.oportunidad(o.id),
      contexto: [o.nombre, o.empresa?.nombre].filter(Boolean).join(" · "),
      responsable: o.responsable,
    }));
  const tareas: Seguimiento[] = pendientes.map((i) => ({
    id: `i-${i.id}`,
    clase: "interaccion",
    tipo: i.tipo,
    titulo: i.titulo,
    fecha: i.fecha,
    vencida: new Date(i.fecha).getTime() < ahoraMs,
    prioridad: i.prioridad,
    href: i.oportunidad
      ? ruta.oportunidad(i.oportunidad.id)
      : i.empresa
        ? ruta.empresa(i.empresa.id)
        : i.contacto
          ? ruta.contacto(i.contacto.id)
          : ruta.tareas,
    contexto:
      [i.oportunidad?.nombre, i.empresa?.nombre, i.contacto ? nombreCompleto(i.contacto) : null].filter(Boolean).join(" · ") ||
      null,
    responsable: i.responsable,
  }));
  const seguimientos = [...acciones, ...tareas].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 10);

  /* ------------------------------- Rankings ------------------------------- */
  const topOportunidades = [...abiertas].sort((a, b) => Number(b.valor) - Number(a.valor)).slice(0, 6);

  const porEmpresa = new Map<string, { empresa: EmpresaMini; abiertas: number; valorAbierto: number; valorGanado: number }>();
  for (const o of todas) {
    if (!o.empresa || o.etapa === "perdida") continue;
    const e = porEmpresa.get(o.empresa.id) ?? { empresa: o.empresa, abiertas: 0, valorAbierto: 0, valorGanado: 0 };
    if (esEtapaAbierta(o.etapa)) {
      e.abiertas += 1;
      e.valorAbierto += Number(o.valor);
    } else e.valorGanado += Number(o.valor);
    porEmpresa.set(o.empresa.id, e);
  }
  const topEmpresas = [...porEmpresa.values()]
    .sort((a, b) => b.valorAbierto + b.valorGanado - (a.valorAbierto + a.valorGanado))
    .slice(0, 6);

  const listaEmpresas = empresas.data ?? [];

  return {
    kpis: {
      abiertas: abiertas.length,
      valorPipeline,
      valorEsperado: suma(abiertas, valorEsperado),
      deltaPipeline,
      ganadas: ganadas.length,
      valorGanado: suma(ganadas),
      perdidas: perdidas.length,
      valorPerdido: suma(perdidas),
      conversion: cerradas > 0 ? (ganadas.length / cerradas) * 100 : null,
      creadasPeriodo: todas.filter((o) => enPeriodo(o.created_at)).length,
      empresasActivas: listaEmpresas.filter((e) => e.estado === "activa").length,
      empresasTotal: listaEmpresas.length,
      contactos: contactos.count ?? 0,
      pendientes: pendientes.length,
      vencidas: pendientes.filter((i) => i.fecha < ahoraIso).length,
      accionesVencidas: acciones.filter((a) => a.vencida).length,
    },
    porEtapa,
    porTipo,
    porMes,
    seguimientos,
    actividad: rec.data ?? [],
    topOportunidades,
    topEmpresas,
    equipo: equipo.data ?? [],
  };
}
