import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Centro, Tarifa } from "@/lib/tipos";

/** Datos que el público puede leer (RLS: centros, tarifas y clases). */

export type ClasePublica = {
  id: string;
  centro_id: string;
  nombre: string;
  disciplina: string;
  monitor: string | null;
  sala: string | null;
  inicio: string;
  duracion_min: number;
  plazas: number;
  nivel: string | null;
};

export type DatosLanding = {
  centros: Centro[];
  tarifas: Tarifa[];
  clases: ClasePublica[];
};

export async function datosLanding(): Promise<DatosLanding> {
  const supabase = await createClient();
  const ahora = new Date().toISOString();
  const [centros, tarifas, clases] = await Promise.all([
    supabase.from("centros").select("*").eq("activo", true).order("aforo", { ascending: false }).returns<Centro[]>(),
    supabase.from("tarifas").select("*").eq("activa", true).order("orden").returns<Tarifa[]>(),
    supabase
      .from("clases")
      .select("id,centro_id,nombre,disciplina,monitor,sala,inicio,duracion_min,plazas,nivel")
      .gte("inicio", ahora)
      .order("inicio")
      .limit(24)
      .returns<ClasePublica[]>(),
  ]);
  return { centros: centros.data ?? [], tarifas: tarifas.data ?? [], clases: clases.data ?? [] };
}
