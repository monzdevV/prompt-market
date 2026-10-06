import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  ETAPAS,
  ETAPAS_ABIERTAS_B2B,
  SELECT_OPORTUNIDAD,
  TIPOS_OPORTUNIDAD,
  esEtapaAbierta,
  nombreCompleto,
  valorEsperado,
  type Etapa,
  type Oportunidad,
  type OportunidadCompleta,
  type TipoOportunidad,
} from "@/lib/b2b";
import { DEFECTO, normalizar, type FiltrosOportunidad } from "@/components/crm/oportunidades/filtros";

/** PostgREST puede devolver numeric como texto: se normaliza a número. */
function limpiar<T extends Pick<Oportunidad, "valor" | "posicion" | "probabilidad">>(o: T): T {
  return {
    ...o,
    valor: Number(o.valor ?? 0),
    posicion: Number(o.posicion ?? 0),
    probabilidad: o.probabilidad == null ? null : Number(o.probabilidad),
  };
}

/**
 * Oportunidades con empresa, contacto y responsable, ordenadas por posición
 * (el orden del Kanban). Los filtros exactos van a la base de datos; la
 * búsqueda de texto se hace aquí para poder mirar también empresa y contacto.
 */
export async function listarOportunidades(filtros: Partial<FiltrosOportunidad> = {}): Promise<OportunidadCompleta[]> {
  const f = { ...DEFECTO, ...filtros };
  const supabase = await createClient();

  let consulta = supabase.from("oportunidades").select(SELECT_OPORTUNIDAD);

  if (f.empresa) consulta = consulta.eq("empresa_id", f.empresa);
  if (f.contacto) consulta = consulta.eq("contacto_id", f.contacto);
  if (f.tipo) consulta = consulta.eq("tipo", f.tipo);
  if (f.prioridad) consulta = consulta.eq("prioridad", f.prioridad);
  if (f.responsable === "sin") consulta = consulta.is("responsable_id", null);
  else if (f.responsable) consulta = consulta.eq("responsable_id", f.responsable);
  if (f.etapa === "abiertas") consulta = consulta.in("etapa", [...ETAPAS_ABIERTAS_B2B]);
  else if (f.etapa !== "todas") consulta = consulta.eq("etapa", f.etapa);

  const campo = f.fecha === "cierre" ? "fecha_cierre" : "created_at";
  if (f.desde) consulta = consulta.gte(campo, f.desde);
  if (f.hasta) consulta = consulta.lte(campo, campo === "created_at" ? `${f.hasta}T23:59:59.999` : f.hasta);
  if (f.vmin) consulta = consulta.gte("valor", Number(f.vmin));
  if (f.vmax) consulta = consulta.lte("valor", Number(f.vmax));

  const { data, error } = await consulta
    .order("posicion", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<OportunidadCompleta[]>();
  if (error) throw new Error(`No se pudieron cargar las oportunidades: ${error.message}`);

  let filas = (data ?? []).map(limpiar);

  const q = normalizar(f.q.trim());
  if (q) {
    filas = filas.filter((o) =>
      normalizar(
        [
          o.nombre,
          o.empresa?.nombre,
          o.contacto ? nombreCompleto(o.contacto) : "",
          o.contacto?.email,
          o.descripcion,
          o.necesidad,
          o.proxima_accion,
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(q)
    );
  }
  return filas;
}

export async function obtenerOportunidad(id: string): Promise<OportunidadCompleta | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("oportunidades")
    .select(SELECT_OPORTUNIDAD)
    .eq("id", id)
    .maybeSingle<OportunidadCompleta>();
  return data ? limpiar(data) : null;
}

export type Suma = { n: number; valor: number; esperado: number };
const cero = (): Suma => ({ n: 0, valor: 0, esperado: 0 });

export type ResumenPipeline = {
  porEtapa: Record<Etapa, Suma>;
  /** Sólo oportunidades abiertas. */
  porTipo: Record<TipoOportunidad, Suma>;
  abiertas: Suma;
  ganadas: Suma;
  perdidas: Suma;
  /** Ganadas / (ganadas + perdidas), en %. null si aún no se ha cerrado ninguna. */
  tasaExito: number | null;
};

/** Totales del pipeline agrupados por etapa y por tipo (para panel y cabeceras). */
export async function resumenPipeline(): Promise<ResumenPipeline> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("oportunidades")
    .select("etapa, tipo, valor, probabilidad")
    .returns<Pick<Oportunidad, "etapa" | "tipo" | "valor" | "probabilidad">[]>();

  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, cero()])) as Record<Etapa, Suma>;
  const porTipo = Object.fromEntries(TIPOS_OPORTUNIDAD.map((t) => [t, cero()])) as Record<TipoOportunidad, Suma>;
  const abiertas = cero();

  for (const fila of data ?? []) {
    const o = { ...fila, valor: Number(fila.valor ?? 0), probabilidad: fila.probabilidad == null ? null : Number(fila.probabilidad) };
    const esp = valorEsperado(o);
    const e = porEtapa[o.etapa];
    if (e) {
      e.n++;
      e.valor += o.valor;
      e.esperado += esp;
    }
    if (esEtapaAbierta(o.etapa)) {
      abiertas.n++;
      abiertas.valor += o.valor;
      abiertas.esperado += esp;
      const t = porTipo[o.tipo];
      if (t) {
        t.n++;
        t.valor += o.valor;
        t.esperado += esp;
      }
    }
  }

  const ganadas = porEtapa.ganada;
  const perdidas = porEtapa.perdida;
  const cerradas = ganadas.n + perdidas.n;
  return {
    porEtapa,
    porTipo,
    abiertas,
    ganadas,
    perdidas,
    tasaExito: cerradas ? (ganadas.n / cerradas) * 100 : null,
  };
}

/** Totales de una lista ya cargada (cabecera de la página). */
export function totalesAbiertas(filas: OportunidadCompleta[]): Suma {
  const s = cero();
  for (const o of filas) {
    if (!esEtapaAbierta(o.etapa)) continue;
    s.n++;
    s.valor += o.valor;
    s.esperado += valorEsperado(o);
  }
  return s;
}
