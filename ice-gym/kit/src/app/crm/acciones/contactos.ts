"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textoDe } from "@/lib/acciones";
import { ESTADOS_CONTACTO, TIPOS_CONTACTO, incluye, ruta } from "@/lib/b2b";
import type { Resultado } from "./b2b";

const nulo = (v: string) => (v === "" ? null : v);

function refrescar(id: string, ...empresas: (string | null | undefined)[]) {
  for (const r of ["/crm", ruta.contactos, ruta.contacto(id), ruta.oportunidades, ruta.empresas]) revalidatePath(r);
  for (const e of new Set(empresas)) if (e) revalidatePath(ruta.empresa(e));
}

/** Edita todos los datos del contacto, incluido cambiarlo de empresa. */
export async function actualizarContacto(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const id = textoDe(fd, "id");
  if (!id) return { ok: false, mensaje: "Falta el contacto." };
  const nombre = textoDe(fd, "nombre");
  if (nombre.length < 1) return { ok: false, mensaje: "Pon el nombre del contacto." };
  const tipo = textoDe(fd, "tipo");
  const estado = textoDe(fd, "estado");
  const empresaId = nulo(textoDe(fd, "empresa_id"));
  const principal = ["on", "true"].includes(textoDe(fd, "principal"));

  const supabase = await createClient();
  const { data: antes } = await supabase.from("contactos").select("empresa_id").eq("id", id).maybeSingle();
  if (!antes) return { ok: false, mensaje: "Ese contacto ya no existe." };

  // Sólo puede haber un contacto principal por empresa.
  if (principal && empresaId) {
    await supabase.from("contactos").update({ principal: false }).eq("empresa_id", empresaId).neq("id", id);
  }

  const { error } = await supabase
    .from("contactos")
    .update({
      nombre,
      apellidos: textoDe(fd, "apellidos"),
      empresa_id: empresaId,
      cargo: nulo(textoDe(fd, "cargo")),
      email: nulo(textoDe(fd, "email")),
      telefono: nulo(textoDe(fd, "telefono")),
      linkedin: nulo(textoDe(fd, "linkedin")),
      avatar_url: nulo(textoDe(fd, "avatar_url")),
      ciudad: nulo(textoDe(fd, "ciudad")),
      pais: textoDe(fd, "pais") || "España",
      tipo: incluye(TIPOS_CONTACTO, tipo) ? tipo : "otro",
      rol: nulo(textoDe(fd, "rol")),
      estado: incluye(ESTADOS_CONTACTO, estado) ? estado : "activo",
      principal: principal && !!empresaId,
      responsable_id: nulo(textoDe(fd, "responsable_id")),
      notas: nulo(textoDe(fd, "notas")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  refrescar(id, antes.empresa_id, empresaId);
  return { ok: true, mensaje: "Contacto actualizado.", id };
}

export async function guardarNotasContacto(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const id = textoDe(fd, "id");
  if (!id) return { ok: false, mensaje: "Falta el contacto." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("contactos")
    .update({ notas: nulo(textoDe(fd, "notas")), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudieron guardar las notas: ${error.message}` };
  revalidatePath(ruta.contacto(id));
  return { ok: true, mensaje: "Notas guardadas.", id };
}

/** Borra el contacto. Sus oportunidades se quedan (sin contacto); su actividad se borra en cascada. */
export async function borrarContacto(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contactos").delete().eq("id", id).select("empresa_id").maybeSingle();
  if (error) return { ok: false, mensaje: `No se pudo borrar: ${error.message}` };
  if (!data) return { ok: false, mensaje: "Ese contacto ya no existe." };
  refrescar(id, data.empresa_id);
  return { ok: true, mensaje: "Contacto borrado." };
}
