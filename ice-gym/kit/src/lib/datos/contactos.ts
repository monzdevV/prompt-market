import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  SELECT_OPORTUNIDAD,
  nombreCompleto,
  type Contacto,
  type ContactoMini,
  type Empresa,
  type EmpresaMini,
  type MiembroMini,
  type OportunidadCompleta,
  type TipoInteraccion,
} from "@/lib/b2b";
import type { FiltrosContactos } from "@/components/crm/contactos/filtros";

/* ------------------------------- Listado ------------------------------- */

export type ContactoFila = Contacto & {
  empresa: Pick<EmpresaMini, "id" | "nombre" | "tipo" | "logo_url"> | null;
  responsable: MiembroMini | null;
  n_oportunidades: number;
  ultima_actividad: { fecha: string; tipo: TipoInteraccion } | null;
};

type FilaBruta = Contacto & {
  empresa: ContactoFila["empresa"];
  responsable: MiembroMini | null;
  oportunidades: { count: number }[];
  interacciones: { fecha: string; tipo: TipoInteraccion }[];
};

const LIMITE = 2000;

/** Quita lo que rompería la sintaxis de `or=(…)` de PostgREST. */
const limpiar = (q: string) => q.replace(/[,()*%\\:"]/g, " ").trim();

/**
 * Contactos con su empresa, responsable y agregados (nº de oportunidades y última
 * actividad) en UNA consulta: el recuento y la última interacción van embebidos.
 */
export async function listarContactos(f: FiltrosContactos): Promise<ContactoFila[]> {
  const supabase = await createClient();
  const q = limpiar(f.q);

  // Búsqueda por nombre de empresa: ids de empresas que casan (consulta pequeña, previa).
  let idsEmpresaQ: string[] = [];
  if (q) {
    const { data } = await supabase.from("empresas").select("id").ilike("nombre", `%${q}%`).limit(100);
    idsEmpresaQ = (data ?? []).map((e) => e.id as string);
  }

  const empresa = f.tipoEmpresa
    ? "empresa:empresas!inner(id, nombre, tipo, logo_url)"
    : "empresa:empresas(id, nombre, tipo, logo_url)";
  let consulta = supabase
    .from("contactos")
    .select(`*, ${empresa}, responsable:equipo(id, nombre, apellidos, color), oportunidades(count), interacciones(fecha, tipo)`)
    .order("fecha", { referencedTable: "interacciones", ascending: false })
    .limit(1, { referencedTable: "interacciones" })
    .order("nombre")
    .range(0, LIMITE - 1);

  if (f.tipoEmpresa) consulta = consulta.eq("empresa.tipo", f.tipoEmpresa);
  if (f.empresa) consulta = consulta.eq("empresa_id", f.empresa);
  if (f.tipo) consulta = consulta.eq("tipo", f.tipo);
  if (f.estado) consulta = consulta.eq("estado", f.estado);
  if (f.responsable === "ninguno") consulta = consulta.is("responsable_id", null);
  else if (f.responsable) consulta = consulta.eq("responsable_id", f.responsable);
  if (f.principal) consulta = consulta.eq("principal", f.principal === "si");
  if (f.pais) consulta = consulta.eq("pais", f.pais);
  if (q) {
    const partes = [`nombre.ilike.%${q}%`, `apellidos.ilike.%${q}%`, `email.ilike.%${q}%`, `cargo.ilike.%${q}%`];
    // «Ana García» busca también nombre + apellidos por separado.
    const [n, ...resto] = q.split(/\s+/);
    if (resto.length) partes.push(`and(nombre.ilike.%${n}%,apellidos.ilike.%${resto.join(" ")}%)`);
    if (idsEmpresaQ.length) partes.push(`empresa_id.in.(${idsEmpresaQ.join(",")})`);
    consulta = consulta.or(partes.join(","));
  }

  const { data, error } = await consulta.returns<FilaBruta[]>();
  if (error) {
    console.error("listarContactos", error.message);
    return [];
  }

  const filas: ContactoFila[] = (data ?? []).map(({ oportunidades, interacciones, ...c }) => ({
    ...c,
    n_oportunidades: oportunidades?.[0]?.count ?? 0,
    ultima_actividad: interacciones?.[0] ?? null,
  }));
  return ordenarContactos(filas, f);
}

const texto = new Intl.Collator("es", { sensitivity: "base" });

function ordenarContactos(filas: ContactoFila[], f: FiltrosContactos) {
  const s = f.dir === "asc" ? 1 : -1;
  const porNombre = (a: ContactoFila, b: ContactoFila) => texto.compare(nombreCompleto(a), nombreCompleto(b));
  const cmp: Record<FiltrosContactos["orden"], (a: ContactoFila, b: ContactoFila) => number> = {
    nombre: (a, b) => s * porNombre(a, b),
    empresa: (a, b) => {
      // Sin empresa siempre al final.
      if (!a.empresa !== !b.empresa) return a.empresa ? -1 : 1;
      return s * texto.compare(a.empresa?.nombre ?? "", b.empresa?.nombre ?? "") || porNombre(a, b);
    },
    oportunidades: (a, b) => s * (a.n_oportunidades - b.n_oportunidades) || porNombre(a, b),
    actividad: (a, b) => {
      const fa = a.ultima_actividad?.fecha;
      const fb = b.ultima_actividad?.fecha;
      if (!fa !== !fb) return fa ? -1 : 1;
      return s * (fa ?? "").localeCompare(fb ?? "") || porNombre(a, b);
    },
    alta: (a, b) => s * a.created_at.localeCompare(b.created_at),
  };
  return filas.sort(cmp[f.orden]);
}

/** Cifras de cabecera y valores para el filtro de país (sobre todos los contactos). */
export async function resumenContactos() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contactos")
    .select("estado, principal, empresa_id, pais")
    .range(0, 9999)
    .returns<Pick<Contacto, "estado" | "principal" | "empresa_id" | "pais">[]>();
  const filas = data ?? [];
  return {
    total: filas.length,
    activos: filas.filter((c) => c.estado === "activo").length,
    principales: filas.filter((c) => c.principal).length,
    empresas: new Set(filas.map((c) => c.empresa_id).filter(Boolean)).size,
    sinEmpresa: filas.filter((c) => !c.empresa_id).length,
    paises: [...new Set(filas.map((c) => c.pais).filter(Boolean))].sort((a, b) => texto.compare(a, b)),
  };
}

/* -------------------------------- Ficha -------------------------------- */

export type ContactoDetalle = Contacto & {
  empresa: Empresa | null;
  responsable: MiembroMini | null;
};

export async function obtenerContacto(id: string) {
  const supabase = await createClient();
  const { data: contacto } = await supabase
    .from("contactos")
    .select("*, empresa:empresas(*), responsable:equipo(id, nombre, apellidos, color)")
    .eq("id", id)
    .maybeSingle<ContactoDetalle>();

  if (!contacto) return { contacto: null, otros: [], oportunidades: [], empresaAbiertas: 0 };

  const empresaId = contacto.empresa_id;
  const [otros, oportunidades, abiertas] = await Promise.all([
    empresaId
      ? supabase
          .from("contactos")
          .select("id, nombre, apellidos, cargo, email, telefono, avatar_url, empresa_id, principal")
          .eq("empresa_id", empresaId)
          .neq("id", id)
          .order("principal", { ascending: false })
          .order("nombre")
          .limit(12)
          .returns<(ContactoMini & { principal: boolean })[]>()
      : Promise.resolve({ data: [] as (ContactoMini & { principal: boolean })[] }),
    supabase
      .from("oportunidades")
      .select(SELECT_OPORTUNIDAD)
      .eq("contacto_id", id)
      .order("updated_at", { ascending: false })
      .returns<OportunidadCompleta[]>(),
    empresaId
      ? supabase
          .from("oportunidades")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("estado", "abierta")
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    contacto,
    otros: otros.data ?? [],
    oportunidades: oportunidades.data ?? [],
    empresaAbiertas: abiertas.count ?? 0,
  };
}
