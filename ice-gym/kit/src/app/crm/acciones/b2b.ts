"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textoDe } from "@/lib/acciones";
import {
  ESTADOS_EMPRESA,
  ESTADOS_INTERACCION,
  ETIQUETA_ETAPA,
  ORIGENES,
  PRIORIDADES,
  PROBABILIDAD_POR_ETAPA,
  TIPOS_CONTACTO,
  TIPOS_EMPRESA,
  TIPOS_INTERACCION_MANUAL,
  TIPOS_OPORTUNIDAD,
  esEtapa,
  estadoParaEtapa,
  incluye,
  type Etapa,
  type EstadoInteraccion,
} from "@/lib/b2b";

/**
 * Acciones compartidas del CRM B2B. Todas devuelven { ok, mensaje } y, al crear,
 * el id nuevo para poder encadenar (p. ej. crear empresa desde el alta de oportunidad).
 */
export type Resultado = { ok: boolean; mensaje: string; id?: string };

const nulo = (v: string) => (v === "" ? null : v);
const numeroDe = (fd: FormData, campo: string) => {
  const v = textoDe(fd, campo).replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function refrescar(...rutas: string[]) {
  for (const r of ["/crm", ...rutas]) revalidatePath(r);
}

/* ------------------------------- Empresas ------------------------------- */

export async function crearEmpresa(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const nombre = textoDe(fd, "nombre");
  if (nombre.length < 2) return { ok: false, mensaje: "Pon el nombre de la empresa." };
  const tipo = textoDe(fd, "tipo");
  const estado = textoDe(fd, "estado") || "activa";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .insert({
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
      estado: incluye(ESTADOS_EMPRESA, estado) ? estado : "activa",
      responsable_id: nulo(textoDe(fd, "responsable_id")),
    })
    .select("id")
    .single();
  if (error) return { ok: false, mensaje: `No se pudo crear la empresa: ${error.message}` };

  refrescar("/crm/empresas", "/crm/oportunidades");
  return { ok: true, mensaje: `${nombre} creada.`, id: data.id };
}

/* ------------------------------- Contactos ------------------------------ */

export async function crearContacto(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const nombre = textoDe(fd, "nombre");
  if (nombre.length < 1) return { ok: false, mensaje: "Pon el nombre del contacto." };
  const tipo = textoDe(fd, "tipo");
  const empresaId = nulo(textoDe(fd, "empresa_id"));
  const principal = textoDe(fd, "principal") === "on" || textoDe(fd, "principal") === "true";

  const supabase = await createClient();
  if (principal && empresaId) {
    await supabase.from("contactos").update({ principal: false }).eq("empresa_id", empresaId);
  }
  const { data, error } = await supabase
    .from("contactos")
    .insert({
      nombre,
      apellidos: textoDe(fd, "apellidos"),
      empresa_id: empresaId,
      cargo: nulo(textoDe(fd, "cargo")),
      email: nulo(textoDe(fd, "email")),
      telefono: nulo(textoDe(fd, "telefono")),
      linkedin: nulo(textoDe(fd, "linkedin")),
      ciudad: nulo(textoDe(fd, "ciudad")),
      pais: textoDe(fd, "pais") || "España",
      tipo: incluye(TIPOS_CONTACTO, tipo) ? tipo : "otro",
      rol: nulo(textoDe(fd, "rol")),
      principal,
      responsable_id: nulo(textoDe(fd, "responsable_id")),
      notas: nulo(textoDe(fd, "notas")),
    })
    .select("id")
    .single();
  if (error) return { ok: false, mensaje: `No se pudo crear el contacto: ${error.message}` };

  refrescar("/crm/contactos", "/crm/oportunidades");
  if (empresaId) revalidatePath(`/crm/empresas/${empresaId}`);
  return { ok: true, mensaje: `${nombre} añadido.`, id: data.id };
}

/* ----------------------------- Oportunidades ---------------------------- */

export async function crearOportunidad(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const nombre = textoDe(fd, "nombre");
  if (nombre.length < 2) return { ok: false, mensaje: "Pon un nombre a la oportunidad." };
  const tipo = textoDe(fd, "tipo");
  const etapaTxt = textoDe(fd, "etapa");
  const etapa: Etapa = esEtapa(etapaTxt) ? etapaTxt : "prospeccion";
  const prioridad = textoDe(fd, "prioridad");
  const origen = textoDe(fd, "origen");
  const empresaId = nulo(textoDe(fd, "empresa_id"));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("oportunidades")
    .insert({
      nombre,
      tipo: incluye(TIPOS_OPORTUNIDAD, tipo) ? tipo : "otros",
      etapa,
      estado: estadoParaEtapa(etapa),
      posicion: -Date.now() / 1000, // arriba de la columna
      valor: numeroDe(fd, "valor") ?? 0,
      probabilidad: numeroDe(fd, "probabilidad") ?? PROBABILIDAD_POR_ETAPA[etapa],
      fecha_cierre: nulo(textoDe(fd, "fecha_cierre")),
      prioridad: incluye(PRIORIDADES, prioridad) ? prioridad : "media",
      origen: incluye(ORIGENES, origen) ? origen : "otro",
      empresa_id: empresaId,
      contacto_id: nulo(textoDe(fd, "contacto_id")),
      responsable_id: nulo(textoDe(fd, "responsable_id")),
      descripcion: nulo(textoDe(fd, "descripcion")),
      necesidad: nulo(textoDe(fd, "necesidad")),
      proxima_accion: nulo(textoDe(fd, "proxima_accion")),
      proxima_accion_fecha: nulo(textoDe(fd, "proxima_accion_fecha")),
    })
    .select("id")
    .single();
  if (error) return { ok: false, mensaje: `No se pudo crear la oportunidad: ${error.message}` };

  await supabase.from("interacciones").insert({
    tipo: "cambio_etapa",
    titulo: `Oportunidad creada en ${ETIQUETA_ETAPA[etapa]}`,
    oportunidad_id: data.id,
    empresa_id: empresaId,
    contacto_id: nulo(textoDe(fd, "contacto_id")),
    responsable_id: nulo(textoDe(fd, "responsable_id")),
  });

  refrescar("/crm/oportunidades", "/crm/empresas", "/crm/contactos");
  return { ok: true, mensaje: `${nombre} creada.`, id: data.id };
}

/**
 * Mueve una oportunidad (drag & drop del Kanban): cambia etapa, estado y posición
 * dentro de la columna, y anota el cambio de etapa en su línea temporal.
 */
export async function moverOportunidad(id: string, etapa: Etapa, posicion: number): Promise<Resultado> {
  if (!esEtapa(etapa)) return { ok: false, mensaje: "Esa etapa no existe." };
  const supabase = await createClient();

  const { data: antes } = await supabase
    .from("oportunidades")
    .select("etapa, estado, empresa_id, contacto_id, responsable_id")
    .eq("id", id)
    .maybeSingle();
  if (!antes) return { ok: false, mensaje: "Esa oportunidad ya no existe." };

  const cambiaEtapa = antes.etapa !== etapa;
  const { error } = await supabase
    .from("oportunidades")
    .update({
      etapa,
      posicion,
      estado: estadoParaEtapa(etapa, antes.estado),
      ...(cambiaEtapa ? { probabilidad: PROBABILIDAD_POR_ETAPA[etapa], updated_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo mover: ${error.message}` };

  if (cambiaEtapa) {
    await supabase.from("interacciones").insert({
      tipo: "cambio_etapa",
      titulo: `${ETIQUETA_ETAPA[antes.etapa as Etapa]} → ${ETIQUETA_ETAPA[etapa]}`,
      oportunidad_id: id,
      empresa_id: antes.empresa_id,
      contacto_id: antes.contacto_id,
      responsable_id: antes.responsable_id,
    });
  }

  refrescar("/crm/oportunidades", `/crm/oportunidades/${id}`);
  return { ok: true, mensaje: cambiaEtapa ? `Movida a ${ETIQUETA_ETAPA[etapa]}.` : "Orden guardado." };
}

/* --------------------- Interacciones (actividades y tareas) --------------------- */

export async function crearInteraccion(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const tipo = textoDe(fd, "tipo");
  if (!incluye(TIPOS_INTERACCION_MANUAL, tipo)) return { ok: false, mensaje: "Elige un tipo." };
  const titulo = textoDe(fd, "titulo");
  if (titulo.length < 2) return { ok: false, mensaje: "Pon un título." };

  const oportunidadId = nulo(textoDe(fd, "oportunidad_id"));
  let empresaId = nulo(textoDe(fd, "empresa_id"));
  let contactoId = nulo(textoDe(fd, "contacto_id"));

  const supabase = await createClient();
  // Hereda empresa y contacto de la oportunidad para que aparezca en todas las fichas.
  if (oportunidadId && (!empresaId || !contactoId)) {
    const { data: o } = await supabase
      .from("oportunidades")
      .select("empresa_id, contacto_id")
      .eq("id", oportunidadId)
      .maybeSingle();
    empresaId ??= o?.empresa_id ?? null;
    contactoId ??= o?.contacto_id ?? null;
  }
  if (contactoId && !empresaId) {
    const { data: c } = await supabase.from("contactos").select("empresa_id").eq("id", contactoId).maybeSingle();
    empresaId = c?.empresa_id ?? null;
  }

  // Fecha: campo datetime-local "fecha", o "dia" + "hora".
  const dia = textoDe(fd, "dia");
  const fechaTxt = textoDe(fd, "fecha") || (dia ? `${dia}T${textoDe(fd, "hora") || "09:00"}` : "");
  const fecha = fechaTxt ? new Date(fechaTxt).toISOString() : new Date().toISOString();

  const estadoTxt = textoDe(fd, "estado");
  const estado: EstadoInteraccion = incluye(ESTADOS_INTERACCION, estadoTxt)
    ? estadoTxt
    : tipo === "tarea" || tipo === "seguimiento"
      ? "pendiente"
      : "completada";
  const prioridad = textoDe(fd, "prioridad");

  const { data, error } = await supabase
    .from("interacciones")
    .insert({
      tipo,
      titulo,
      descripcion: nulo(textoDe(fd, "descripcion")),
      fecha,
      estado,
      prioridad: incluye(PRIORIDADES, prioridad) ? prioridad : "media",
      completada_at: estado === "completada" ? new Date().toISOString() : null,
      responsable_id: nulo(textoDe(fd, "responsable_id")),
      empresa_id: empresaId,
      contacto_id: contactoId,
      oportunidad_id: oportunidadId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  refrescar("/crm/actividades", "/crm/tareas");
  if (oportunidadId) revalidatePath(`/crm/oportunidades/${oportunidadId}`);
  if (empresaId) revalidatePath(`/crm/empresas/${empresaId}`);
  if (contactoId) revalidatePath(`/crm/contactos/${contactoId}`);
  return { ok: true, mensaje: tipo === "tarea" ? "Tarea creada." : "Actividad registrada.", id: data.id };
}

/** Marca una tarea/actividad como pendiente, completada o cancelada. */
export async function cambiarEstadoInteraccion(id: string, estado: EstadoInteraccion): Promise<Resultado> {
  if (!incluye(ESTADOS_INTERACCION, estado)) return { ok: false, mensaje: "Estado no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interacciones")
    .update({ estado, completada_at: estado === "completada" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("empresa_id, contacto_id, oportunidad_id")
    .single();
  if (error) return { ok: false, mensaje: `No se pudo actualizar: ${error.message}` };

  refrescar("/crm/actividades", "/crm/tareas");
  if (data.oportunidad_id) revalidatePath(`/crm/oportunidades/${data.oportunidad_id}`);
  if (data.empresa_id) revalidatePath(`/crm/empresas/${data.empresa_id}`);
  if (data.contacto_id) revalidatePath(`/crm/contactos/${data.contacto_id}`);
  return { ok: true, mensaje: estado === "completada" ? "Completada." : "Actualizada." };
}

export async function borrarInteraccion(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("interacciones").delete().eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo borrar: ${error.message}` };
  refrescar("/crm/actividades", "/crm/tareas", "/crm/oportunidades", "/crm/empresas", "/crm/contactos");
  return { ok: true, mensaje: "Borrada." };
}
