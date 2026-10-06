import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  etiquetaSector,
  nombreCompleto,
  type EstadoInteraccion,
  type Etapa,
  type TipoEmpresa,
  type TipoInteraccion,
  type TipoOportunidad,
} from "@/lib/b2b";

export type ResultadoBusqueda = {
  empresas: { id: string; nombre: string; tipo: TipoEmpresa; sector: string; ciudad: string | null; logo_url: string | null }[];
  contactos: {
    id: string;
    nombre: string;
    apellidos: string;
    cargo: string | null;
    email: string | null;
    avatar_url: string | null;
    empresa: { id: string; nombre: string } | null;
  }[];
  oportunidades: {
    id: string;
    nombre: string;
    tipo: TipoOportunidad;
    etapa: Etapa;
    valor: number;
    empresa: { id: string; nombre: string } | null;
  }[];
  interacciones: {
    id: string;
    titulo: string;
    tipo: TipoInteraccion;
    estado: EstadoInteraccion;
    fecha: string;
    empresa: { id: string; nombre: string } | null;
    contacto: { id: string; nombre: string; apellidos: string } | null;
    oportunidad: { id: string; nombre: string } | null;
  }[];
};

const VACIO: ResultadoBusqueda = { empresas: [], contactos: [], oportunidades: [], interacciones: [] };
const POR_GRUPO = 5;

/** Minúsculas y sin tildes: «García» y «garcia» son lo mismo. */
const normalizar = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Filtra y ordena en JS: cada palabra de la consulta debe aparecer en algún campo.
 * Primero lo que empieza por la consulta en el campo principal, luego el resto.
 */
function filtrar<T>(filas: T[], palabras: string[], campos: (f: T) => (string | null | undefined)[]) {
  const frase = palabras.join(" ");
  const puntuadas: { f: T; p: number }[] = [];
  for (const f of filas) {
    const valores = campos(f).map(normalizar);
    const pajar = valores.join(" ");
    if (!palabras.every((w) => pajar.includes(w))) continue;
    const principal = valores[0] ?? "";
    const p = principal.startsWith(frase) ? 0 : principal.includes(frase) ? 1 : palabras.every((w) => principal.includes(w)) ? 2 : 3;
    puntuadas.push({ f, p });
  }
  return puntuadas.sort((a, b) => a.p - b.p).slice(0, POR_GRUPO).map((x) => x.f);
}

/**
 * Búsqueda rápida para la paleta de comandos (se sirve desde /crm/buscar).
 * Empresas, contactos, oportunidades y actividades filtradas en JS
 * (sin tildes, varias palabras).
 */
export async function buscarGlobal(texto: string): Promise<ResultadoBusqueda> {
  // Fuera los caracteres que tienen significado en los filtros de PostgREST.
  const q = texto.replace(/[,()*%\\:"']/g, " ").trim().slice(0, 60);
  if (q.length < 2) return VACIO;

  const crudas = q.split(/\s+/).filter(Boolean).slice(0, 5);
  const palabras = crudas.map(normalizar);
  const supabase = await createClient();

  const [empresas, contactos, oportunidades, interacciones] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, nombre, tipo, sector, ciudad, logo_url")
      .order("nombre")
      .limit(3000)
      .returns<ResultadoBusqueda["empresas"]>(),
    supabase
      .from("contactos")
      .select("id, nombre, apellidos, cargo, email, avatar_url, empresa:empresas(id, nombre)")
      .order("nombre")
      .limit(5000)
      .returns<ResultadoBusqueda["contactos"]>(),
    supabase
      .from("oportunidades")
      .select("id, nombre, tipo, etapa, valor, empresa:empresas(id, nombre)")
      .order("updated_at", { ascending: false })
      .limit(5000)
      .returns<ResultadoBusqueda["oportunidades"]>(),
    supabase
      .from("interacciones")
      .select(
        "id, titulo, tipo, estado, fecha, empresa:empresas(id, nombre), contacto:contactos(id, nombre, apellidos), oportunidad:oportunidades(id, nombre)",
      )
      .neq("tipo", "cambio_etapa")
      .order("fecha", { ascending: false })
      .limit(3000)
      .returns<ResultadoBusqueda["interacciones"]>(),
  ]);

  return {
    empresas: filtrar(empresas.data ?? [], palabras, (e) => [e.nombre, e.sector, etiquetaSector(e.sector), e.ciudad]),
    contactos: filtrar(contactos.data ?? [], palabras, (c) => [nombreCompleto(c), c.email, c.cargo, c.empresa?.nombre]),
    oportunidades: filtrar(oportunidades.data ?? [], palabras, (o) => [o.nombre, o.empresa?.nombre]),
    interacciones: filtrar(interacciones.data ?? [], palabras, (i) => [i.titulo]),
  };
}
