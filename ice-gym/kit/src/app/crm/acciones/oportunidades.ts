"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textoDe } from "@/lib/acciones";
import {
  ESTADOS_OPORTUNIDAD,
  ETIQUETA_ETAPA,
  ORIGENES,
  PRIORIDADES,
  PROBABILIDAD_POR_ETAPA,
  TIPOS_OPORTUNIDAD,
  esEtapa,
  estadoParaEtapa,
  incluye,
  type Etapa,
  type EstadoOportunidad,
} from "@/lib/b2b";
import { moverOportunidad, type Resultado } from "./b2b";

/** Acciones propias de la sección Oportunidades (editar, cerrar, borrar). */

const nulo = (v: string) => (v === "" ? null : v);
const numeroDe = (fd: FormData, campo: string) => {
  const v = textoDe(fd, campo).replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function refrescar(id?: string, ...extra: (string | null | undefined)[]) {
  for (const r of ["/crm", "/crm/oportunidades", "/crm/empresas", "/crm/contactos", "/crm/actividades", "/crm/tareas"]) revalidatePath(r);
  if (id) revalidatePath(`/crm/oportunidades/${id}`);
  for (const r of extra) if (r) revalidatePath(r);
}

/** Primera posición libre arriba de una columna del Kanban. */
async function posicionArriba(etapa: Etapa) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("oportunidades")
    .select("posicion")
    .eq("etapa", etapa)
    .order("posicion", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.posicion) - 1 : 0;
}

/** Edición completa desde la ficha. Si cambia la etapa, lo anota en la línea temporal. */
export async function actualizarOportunidad(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const id = textoDe(fd, "id");
  if (!id) return { ok: false, mensaje: "Falta la oportunidad." };
  const nombre = textoDe(fd, "nombre");
  if (nombre.length < 2) return { ok: false, mensaje: "Pon un nombre a la oportunidad." };

  const supabase = await createClient();
  const { data: antes } = await supabase
    .from("oportunidades")
    .select("etapa, estado, posicion")
    .eq("id", id)
    .maybeSingle();
  if (!antes) return { ok: false, mensaje: "Esa oportunidad ya no existe." };

  const etapaTxt = textoDe(fd, "etapa");
  const etapa: Etapa = esEtapa(etapaTxt) ? etapaTxt : (antes.etapa as Etapa);
  const cambiaEtapa = etapa !== antes.etapa;
  const tipo = textoDe(fd, "tipo");
  const prioridad = textoDe(fd, "prioridad");
  const origen = textoDe(fd, "origen");
  const estadoTxt = textoDe(fd, "estado");
  const estadoPedido: EstadoOportunidad = incluye(ESTADOS_OPORTUNIDAD, estadoTxt) ? estadoTxt : (antes.estado as EstadoOportunidad);
  const empresaId = nulo(textoDe(fd, "empresa_id"));
  const contactoId = nulo(textoDe(fd, "contacto_id"));
  const responsableId = nulo(textoDe(fd, "responsable_id"));

  const { error } = await supabase
    .from("oportunidades")
    .update({
      nombre,
      tipo: incluye(TIPOS_OPORTUNIDAD, tipo) ? tipo : "otros",
      etapa,
      estado: estadoParaEtapa(etapa, estadoPedido),
      posicion: cambiaEtapa ? await posicionArriba(etapa) : antes.posicion,
      valor: numeroDe(fd, "valor") ?? 0,
      probabilidad: numeroDe(fd, "probabilidad") ?? PROBABILIDAD_POR_ETAPA[etapa],
      fecha_cierre: nulo(textoDe(fd, "fecha_cierre")),
      prioridad: incluye(PRIORIDADES, prioridad) ? prioridad : "media",
      origen: incluye(ORIGENES, origen) ? origen : "otro",
      empresa_id: empresaId,
      contacto_id: contactoId,
      responsable_id: responsableId,
      descripcion: nulo(textoDe(fd, "descripcion")),
      necesidad: nulo(textoDe(fd, "necesidad")),
      notas: nulo(textoDe(fd, "notas")),
      proxima_accion: nulo(textoDe(fd, "proxima_accion")),
      proxima_accion_fecha: nulo(textoDe(fd, "proxima_accion_fecha")),
      motivo_perdida: etapa === "perdida" ? nulo(textoDe(fd, "motivo_perdida")) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  if (cambiaEtapa) {
    await supabase.from("interacciones").insert({
      tipo: "cambio_etapa",
      titulo: `${ETIQUETA_ETAPA[antes.etapa as Etapa]} → ${ETIQUETA_ETAPA[etapa]}`,
      oportunidad_id: id,
      empresa_id: empresaId,
      contacto_id: contactoId,
      responsable_id: responsableId,
    });
  }

  refrescar(id, empresaId && `/crm/empresas/${empresaId}`, contactoId && `/crm/contactos/${contactoId}`);
  return { ok: true, mensaje: "Cambios guardados.", id };
}

/** Cambia de etapa poniéndola arriba de la columna de destino (menús y selector de la ficha). */
export async function cambiarEtapa(id: string, etapa: Etapa): Promise<Resultado> {
  if (!esEtapa(etapa)) return { ok: false, mensaje: "Esa etapa no existe." };
  return moverOportunidad(id, etapa, await posicionArriba(etapa));
}

export async function marcarGanada(id: string): Promise<Resultado> {
  const r = await cambiarEtapa(id, "ganada");
  return r.ok ? { ...r, mensaje: "¡Oportunidad ganada!" } : r;
}

/**
 * Cierra como perdida guardando el motivo. `posicion` llega desde el Kanban
 * (donde se soltó la tarjeta); si no, va arriba de la columna.
 */
export async function marcarPerdida(id: string, motivo: string, posicion?: number): Promise<Resultado> {
  const texto = motivo.trim().slice(0, 500);
  if (texto.length < 2) return { ok: false, mensaje: "Explica brevemente por qué se perdió." };

  const supabase = await createClient();
  const { data: antes } = await supabase
    .from("oportunidades")
    .select("etapa, empresa_id, contacto_id, responsable_id")
    .eq("id", id)
    .maybeSingle();
  if (!antes) return { ok: false, mensaje: "Esa oportunidad ya no existe." };

  const cambiaEtapa = antes.etapa !== "perdida";
  const { error } = await supabase
    .from("oportunidades")
    .update({
      etapa: "perdida",
      estado: "perdida",
      probabilidad: 0,
      motivo_perdida: texto,
      posicion: posicion ?? (cambiaEtapa ? await posicionArriba("perdida") : undefined),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo cerrar: ${error.message}` };

  await supabase.from("interacciones").insert({
    tipo: "cambio_etapa",
    titulo: cambiaEtapa ? `${ETIQUETA_ETAPA[antes.etapa as Etapa]} → Perdida` : "Motivo de pérdida actualizado",
    descripcion: `Motivo: ${texto}`,
    oportunidad_id: id,
    empresa_id: antes.empresa_id,
    contacto_id: antes.contacto_id,
    responsable_id: antes.responsable_id,
  });

  refrescar(id);
  return { ok: true, mensaje: "Marcada como perdida." };
}

/** Guarda sólo las notas internas (editor en línea de la ficha). */
export async function guardarNotas(id: string, notas: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("oportunidades")
    .update({ notas: notas.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudieron guardar las notas: ${error.message}` };
  revalidatePath(`/crm/oportunidades/${id}`);
  return { ok: true, mensaje: "Notas guardadas." };
}

/**
 * Borra la oportunidad. Los cambios de etapa automáticos se van con ella; las
 * actividades escritas a mano se conservan en la empresa y el contacto.
 */
export async function borrarOportunidad(id: string): Promise<Resultado> {
  const supabase = await createClient();
  await supabase.from("interacciones").delete().eq("oportunidad_id", id).eq("tipo", "cambio_etapa");
  await supabase.from("interacciones").update({ oportunidad_id: null }).eq("oportunidad_id", id);
  const { error } = await supabase.from("oportunidades").delete().eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo borrar: ${error.message}` };
  refrescar();
  return { ok: true, mensaje: "Oportunidad borrada." };
}
