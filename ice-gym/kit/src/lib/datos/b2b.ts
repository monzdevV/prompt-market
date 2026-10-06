import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ContactoMini, EmpresaMini, Miembro } from "@/lib/b2b";

/** Catálogos compartidos por formularios y filtros del CRM B2B. */

export async function listarEquipo(): Promise<Miembro[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("equipo").select("*").order("nombre").returns<Miembro[]>();
  return data ?? [];
}

export async function opcionesEmpresas(): Promise<EmpresaMini[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("empresas")
    .select("id, nombre, tipo, sector, logo_url")
    .order("nombre")
    .returns<EmpresaMini[]>();
  return data ?? [];
}

export async function opcionesContactos(): Promise<ContactoMini[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contactos")
    .select("id, nombre, apellidos, cargo, email, telefono, avatar_url, empresa_id, principal")
    .order("nombre")
    .returns<ContactoMini[]>();
  return data ?? [];
}

/** Los tres catálogos de una vez: lo que necesita cualquier formulario de alta. */
/** Con `cache`: el layout y la página lo piden en la misma petición y solo se consulta una vez. */
export const catalogos = cache(async () => {
  const [equipo, empresas, contactos] = await Promise.all([listarEquipo(), opcionesEmpresas(), opcionesContactos()]);
  return { equipo, empresas, contactos };
});
export type Catalogos = Awaited<ReturnType<typeof catalogos>>;
