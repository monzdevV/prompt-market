"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textoDe } from "@/lib/acciones";
import { ESTADOS_EMPRESA, TIPOS_EMPRESA, incluye, type EstadoEmpresa } from "@/lib/b2b";
import type { Resultado } from "./b2b";

/** Acciones propias de la ficha y el listado de empresas. */

const nulo = (v: string) => (v === "" ? null : v);

function refrescar(id?: string) {
  revalidatePath("/crm");
  revalidatePath("/crm/empresas");
  if (id) revalidatePath(`/crm/empresas/${id}`);
}

export async function actualizarEmpresa(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const id = textoDe(fd, "id");
  if (!id) return { ok: false, mensaje: "Falta la empresa." };
  const nombre = textoDe(fd, "nombre");
  if (nombre.length < 2) return { ok: false, mensaje: "Pon el nombre de la empresa." };
  const tipo = textoDe(fd, "tipo");
  const estado = textoDe(fd, "estado");

  const supabase = await createClient();
  const { error } = await supabase
    .from("empresas")
    .update({
      nombre,
      tipo: incluye(TIPOS_EMPRESA, tipo) ? tipo : "prospecto",
      sector: textoDe(fd, "sector") || "otros",
      web: nulo(textoDe(fd, "web")),
      email: nulo(textoDe(fd, "email")),
      telefono: nulo(textoDe(fd, "telefono")),
      direccion: nulo(textoDe(fd, "direccion")),
      ciudad: nulo(textoDe(fd, "ciudad")),
      pais: textoDe(fd, "pais") || "España",
      cif: nulo(textoDe(fd, "cif")),
      descripcion: nulo(textoDe(fd, "descripcion")),
      logo_url: nulo(textoDe(fd, "logo_url")),
      estado: incluye(ESTADOS_EMPRESA, estado) ? estado : "activa",
      responsable_id: nulo(textoDe(fd, "responsable_id")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  refrescar(id);
  revalidatePath("/crm/oportunidades");
  revalidatePath("/crm/contactos");
  return { ok: true, mensaje: "Empresa actualizada.", id };
}

export async function cambiarEstadoEmpresa(id: string, estado: EstadoEmpresa): Promise<Resultado> {
  if (!incluye(ESTADOS_EMPRESA, estado)) return { ok: false, mensaje: "Estado no válido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("empresas")
    .update({ estado, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo cambiar: ${error.message}` };
  refrescar(id);
  return { ok: true, mensaje: "Estado actualizado." };
}

/** Borra la empresa. Sus contactos y oportunidades se quedan sin empresa; su actividad se borra. */
export async function borrarEmpresa(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("empresas").delete().eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo borrar: ${error.message}` };
  refrescar();
  revalidatePath("/crm/oportunidades");
  revalidatePath("/crm/contactos");
  return { ok: true, mensaje: "Empresa borrada." };
}

export async function guardarNotasEmpresa(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const id = textoDe(fd, "id");
  if (!id) return { ok: false, mensaje: "Falta la empresa." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("empresas")
    .update({ notas: nulo(textoDe(fd, "notas")), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudieron guardar las notas: ${error.message}` };
  refrescar(id);
  return { ok: true, mensaje: "Notas guardadas." };
}

/** Marca un contacto como principal de su empresa (y desmarca al resto). */
export async function marcarContactoPrincipal(empresaId: string, contactoId: string): Promise<Resultado> {
  const supabase = await createClient();
  const quitar = await supabase
    .from("contactos")
    .update({ principal: false })
    .eq("empresa_id", empresaId)
    .neq("id", contactoId);
  if (quitar.error) return { ok: false, mensaje: `No se pudo cambiar: ${quitar.error.message}` };
  const { error } = await supabase
    .from("contactos")
    .update({ principal: true })
    .eq("id", contactoId)
    .eq("empresa_id", empresaId);
  if (error) return { ok: false, mensaje: `No se pudo cambiar: ${error.message}` };
  refrescar(empresaId);
  revalidatePath("/crm/contactos");
  revalidatePath(`/crm/contactos/${contactoId}`);
  return { ok: true, mensaje: "Contacto principal actualizado." };
}
