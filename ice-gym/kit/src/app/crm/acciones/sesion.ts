"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textoDe, type EstadoAccion } from "@/lib/acciones";

export async function entrar(_anterior: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const email = textoDe(formData, "email");
  const password = textoDe(formData, "password");
  const siguiente = textoDe(formData, "siguiente");

  if (!email || !password) {
    return { ok: false, mensaje: "Escribe tu email y tu contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      mensaje:
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : error.message,
    };
  }

  revalidatePath("/crm", "layout");
  redirect(siguiente.startsWith("/crm") ? siguiente : "/crm");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/crm", "layout");
  redirect("/crm/acceso");
}
