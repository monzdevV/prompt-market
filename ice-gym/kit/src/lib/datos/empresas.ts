import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FILTROS_DEFECTO, type FiltrosEmpresas, type OrdenEmpresa } from "@/components/crm/empresas/filtros";

export * from "@/components/crm/empresas/filtros";
import {
  SELECT_OPORTUNIDAD,
  TIPOS_EMPRESA,
  esEtapaAbierta,
  type Contacto,
  type Empresa,
  type Etapa,
  type MiembroMini,
  type OportunidadCompleta,
  type TipoEmpresa,
} from "@/lib/b2b";

/* -------------------------------- Tipos -------------------------------- */

export type EmpresaConResumen = Empresa & {
  responsable: MiembroMini | null;
  n_contactos: number;
  n_oportunidades: number;
  n_abiertas: number;
  valor_total: number;
  valor_abierto: number;
  ultima_actividad: string | null;
};

const SELECT_EMPRESA = "*, responsable:equipo(id, nombre, apellidos, color)";

function normal(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function max(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/* ------------------------------- Listado ------------------------------- */

/**
 * Empresas con sus agregados (contactos, oportunidades, valor y última actividad).
 * Cuatro consultas en paralelo y el cruce en memoria: nunca una consulta por empresa.
 * El tipo se filtra aparte con `filtrarPorTipo` para poder contar los chips.
 */
export async function listarEmpresas(f: Partial<FiltrosEmpresas> = {}): Promise<EmpresaConResumen[]> {
  const filtros = { ...FILTROS_DEFECTO, ...f };
  const supabase = await createClient();

  let consulta = supabase.from("empresas").select(SELECT_EMPRESA);
  if (filtros.sector !== "todos") consulta = consulta.eq("sector", filtros.sector);
  if (filtros.estado !== "todos") consulta = consulta.eq("estado", filtros.estado);
  if (filtros.responsable === "nadie") consulta = consulta.is("responsable_id", null);
  else if (filtros.responsable !== "todos") consulta = consulta.eq("responsable_id", filtros.responsable);

  const [empresas, contactos, oportunidades, interacciones] = await Promise.all([
    consulta.order("nombre").returns<(Empresa & { responsable: MiembroMini | null })[]>(),
    supabase.from("contactos").select("empresa_id").not("empresa_id", "is", null).returns<{ empresa_id: string }[]>(),
    supabase
      .from("oportunidades")
      .select("empresa_id, valor, etapa, updated_at")
      .not("empresa_id", "is", null)
      .returns<{ empresa_id: string; valor: number; etapa: Etapa; updated_at: string }[]>(),
    supabase
      .from("interacciones")
      .select("empresa_id, fecha")
      .not("empresa_id", "is", null)
      .lte("fecha", new Date().toISOString())
      .order("fecha", { ascending: false })
      .limit(10000)
      .returns<{ empresa_id: string; fecha: string }[]>(),
  ]);

  type Agregado = Pick<
    EmpresaConResumen,
    "n_contactos" | "n_oportunidades" | "n_abiertas" | "valor_total" | "valor_abierto" | "ultima_actividad"
  >;
  const agregados = new Map<string, Agregado>();
  const de = (id: string) => {
    let a = agregados.get(id);
    if (!a) {
      a = { n_contactos: 0, n_oportunidades: 0, n_abiertas: 0, valor_total: 0, valor_abierto: 0, ultima_actividad: null };
      agregados.set(id, a);
    }
    return a;
  };

  for (const c of contactos.data ?? []) de(c.empresa_id).n_contactos++;
  for (const o of oportunidades.data ?? []) {
    const a = de(o.empresa_id);
    const v = Number(o.valor) || 0;
    a.n_oportunidades++;
    a.valor_total += v;
    if (esEtapaAbierta(o.etapa)) {
      a.n_abiertas++;
      a.valor_abierto += v;
    }
    a.ultima_actividad = max(a.ultima_actividad, o.updated_at);
  }
  for (const i of interacciones.data ?? []) {
    const a = de(i.empresa_id);
    a.ultima_actividad = max(a.ultima_actividad, i.fecha);
  }

  const q = normal(filtros.q.trim());
  let filas: EmpresaConResumen[] = (empresas.data ?? []).map((e) => ({
    ...e,
    n_contactos: 0,
    n_oportunidades: 0,
    n_abiertas: 0,
    valor_total: 0,
    valor_abierto: 0,
    ...agregados.get(e.id),
    ultima_actividad: agregados.get(e.id)?.ultima_actividad ?? null,
  }));

  filas = filas.filter((e) => {
    if (filtros.ops === "0" && e.n_oportunidades !== 0) return false;
    if (filtros.ops === "1-2" && (e.n_oportunidades < 1 || e.n_oportunidades > 2)) return false;
    if (filtros.ops === "3+" && e.n_oportunidades < 3) return false;
    if (q) {
      const texto = normal(
        [e.nombre, e.email ?? "", e.web ?? "", e.telefono ?? "", e.ciudad ?? "", e.pais, e.cif ?? "", e.sector].join(" ")
      );
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  const signo = filtros.dir === "asc" ? 1 : -1;
  const comparar: Record<OrdenEmpresa, (a: EmpresaConResumen, b: EmpresaConResumen) => number> = {
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
    valor: (a, b) => a.valor_total - b.valor_total,
    oportunidades: (a, b) => a.n_oportunidades - b.n_oportunidades,
    creacion: (a, b) => a.created_at.localeCompare(b.created_at),
    actividad: (a, b) => (a.ultima_actividad ?? "").localeCompare(b.ultima_actividad ?? ""),
  };
  filas.sort((a, b) => signo * comparar[filtros.orden](a, b) || a.nombre.localeCompare(b.nombre, "es"));

  return filtros.tipo === "todos" ? filas : filtrarPorTipo(filas, filtros.tipo);
}

export const filtrarPorTipo = (filas: EmpresaConResumen[], tipo: "todos" | TipoEmpresa) =>
  tipo === "todos" ? filas : filas.filter((e) => e.tipo === tipo);

/** Recuento global por tipo (para la cabecera), sin filtros. */
export async function contarEmpresasPorTipo(): Promise<{ total: number } & Record<TipoEmpresa, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("empresas").select("tipo").returns<{ tipo: TipoEmpresa }[]>();
  const cuenta = Object.fromEntries(TIPOS_EMPRESA.map((t) => [t, 0])) as Record<TipoEmpresa, number>;
  for (const e of data ?? []) if (e.tipo in cuenta) cuenta[e.tipo]++;
  return { total: data?.length ?? 0, ...cuenta };
}

/** Sectores en uso (para ofrecer en el filtro también los que no están en el catálogo). */
export async function sectoresUsados(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("empresas").select("sector").returns<{ sector: string }[]>();
  return [...new Set((data ?? []).map((e) => e.sector))].sort();
}

/* -------------------------------- Ficha -------------------------------- */

export type EmpresaFicha = Empresa & {
  responsable: MiembroMini | null;
  contactos: Contacto[];
  oportunidades: OportunidadCompleta[];
};

export async function obtenerEmpresa(id: string): Promise<EmpresaFicha | null> {
  const supabase = await createClient();
  const [empresa, contactos, oportunidades] = await Promise.all([
    supabase
      .from("empresas")
      .select(SELECT_EMPRESA)
      .eq("id", id)
      .maybeSingle<Empresa & { responsable: MiembroMini | null }>(),
    supabase
      .from("contactos")
      .select("*")
      .eq("empresa_id", id)
      .order("principal", { ascending: false })
      .order("nombre")
      .returns<Contacto[]>(),
    supabase
      .from("oportunidades")
      .select(SELECT_OPORTUNIDAD)
      .eq("empresa_id", id)
      .order("updated_at", { ascending: false })
      .returns<OportunidadCompleta[]>(),
  ]);
  if (!empresa.data) return null;
  return { ...empresa.data, contactos: contactos.data ?? [], oportunidades: oportunidades.data ?? [] };
}
