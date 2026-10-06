"use server";

import { createClient } from "@/lib/supabase/server";
import { sinMarca } from "@/marca";
import { textoDe } from "@/lib/acciones";
import { codigoCentro } from "@/design/tokens";

/** Acciones de la web pública. Solo usan la clave anon: RLS permite a anon insertar leads, no leerlos. */

export type CampoVisita = "nombre" | "email" | "telefono" | "centro_id" | "tarifa_id" | "mensaje" | "consentimiento";

export type EstadoVisita = {
  ok: boolean | null;
  mensaje: string;
  errores?: Partial<Record<CampoVisita, string>>;
  /** Código de tres letras del centro elegido, para la confirmación. */
  codigo?: string;
  centro?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TELEFONO = /^[+\d][\d\s().-]{6,19}$/;

export async function pedirVisita(_anterior: EstadoVisita, formData: FormData): Promise<EstadoVisita> {
  // Honeypot: una persona no ve este campo. Si llega relleno, fingimos éxito y no guardamos nada.
  if (textoDe(formData, "web")) return { ok: true, mensaje: "Solicitud recibida.", codigo: "—", centro: "" };

  const nombre = textoDe(formData, "nombre");
  const email = textoDe(formData, "email").toLowerCase();
  const telefono = textoDe(formData, "telefono");
  const centroId = textoDe(formData, "centro_id");
  const tarifaId = textoDe(formData, "tarifa_id");
  const mensaje = textoDe(formData, "mensaje");
  const consentimiento = formData.get("consentimiento") === "si";

  const errores: EstadoVisita["errores"] = {};
  if (nombre.length < 2) errores.nombre = "Escribe tu nombre.";
  else if (nombre.length > 120) errores.nombre = "El nombre es demasiado largo.";
  if (!EMAIL.test(email) || email.length > 200) errores.email = "Ese email no parece válido.";
  if (telefono && !TELEFONO.test(telefono)) errores.telefono = "Revisa el teléfono.";
  if (!UUID.test(centroId)) errores.centro_id = "Elige un centro.";
  if (tarifaId && !UUID.test(tarifaId)) errores.tarifa_id = "Esa tarifa no existe.";
  if (mensaje.length > 1000) errores.mensaje = "Máximo 1000 caracteres.";
  if (!consentimiento) errores.consentimiento = "Necesitamos tu permiso para contactarte.";

  if (Object.keys(errores).length) {
    return { ok: false, mensaje: "Revisa los campos marcados.", errores };
  }

  const supabase = await createClient();

  const [centro, tarifa] = await Promise.all([
    supabase.from("centros").select("id,nombre,slug").eq("id", centroId).eq("activo", true).maybeSingle(),
    tarifaId
      ? supabase.from("tarifas").select("id").eq("id", tarifaId).eq("activa", true).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (!centro.data) {
    return { ok: false, mensaje: "Revisa los campos marcados.", errores: { centro_id: "Ese centro no existe." } };
  }
  if (tarifaId && !tarifa.data) {
    return { ok: false, mensaje: "Revisa los campos marcados.", errores: { tarifa_id: "Esa tarifa no existe." } };
  }

  // Sin .select(): anon puede insertar pero no leer leads.
  const { error } = await supabase.from("leads").insert({
    nombre,
    email,
    telefono: telefono || null,
    mensaje: mensaje || null,
    origen: "web",
    estado: "nuevo",
    centro_id: centro.data.id,
    tarifa_interes_id: tarifaId || null,
  });

  if (error) {
    return { ok: false, mensaje: "No hemos podido enviar tu solicitud. Inténtalo de nuevo en un momento." };
  }

  const nombreCentro = sinMarca(String(centro.data.nombre));
  return {
    ok: true,
    mensaje: "Solicitud recibida.",
    codigo: codigoCentro(centro.data.slug ?? centro.data.nombre),
    centro: nombreCentro,
  };
}
