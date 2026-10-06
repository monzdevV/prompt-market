"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textoDe } from "@/lib/acciones";
import { COLORES_EQUIPO, incluye } from "@/lib/b2b";
import type { Resultado } from "./b2b";

/** Ajustes del CRM: miembros del equipo comercial. */

function refrescar() {
  revalidatePath("/crm", "layout");
}

/** Alta (sin `id`) o edición (con `id`) de un miembro del equipo. */
export async function guardarMiembro(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const id = textoDe(fd, "id");
  const nombre = textoDe(fd, "nombre");
  const email = textoDe(fd, "email").toLowerCase();
  const color = textoDe(fd, "color");
  if (nombre.length < 2) return { ok: false, mensaje: "Pon el nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, mensaje: "Escribe un email válido." };

  const fila = {
    nombre,
    apellidos: textoDe(fd, "apellidos"),
    email,
    puesto: textoDe(fd, "puesto") || null,
    color: incluye(COLORES_EQUIPO, color) ? color : "azul",
  };

  const supabase = await createClient();
  const { data: repetido } = await supabase.from("equipo").select("id").ilike("email", email).neq("id", id || "00000000-0000-0000-0000-000000000000").maybeSingle();
  if (repetido) return { ok: false, mensaje: "Ya hay alguien del equipo con ese email." };

  if (id) {
    const { error } = await supabase.from("equipo").update(fila).eq("id", id);
    if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };
    refrescar();
    return { ok: true, mensaje: `${nombre} actualizado.`, id };
  }
  const { data, error } = await supabase.from("equipo").insert(fila).select("id").single();
  if (error) return { ok: false, mensaje: `No se pudo añadir: ${error.message}` };
  refrescar();
  return { ok: true, mensaje: `${nombre} añadido al equipo.`, id: data.id };
}

/** Activa o desactiva a un miembro (los inactivos no salen al asignar). */
export async function cambiarActivoMiembro(id: string, activo: boolean): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("equipo").update({ activo }).eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo cambiar: ${error.message}` };
  refrescar();
  return { ok: true, mensaje: activo ? "Miembro activado." : "Miembro desactivado." };
}
