import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAcceso } from "@/components/crm/FormularioAcceso";
import { InterruptorTema } from "@/components/crm/InterruptorTema";
import { createClient } from "@/lib/supabase/server";
import { inicialesMarca, MARCA, sinMarca } from "@/marca";

export const metadata: Metadata = { title: "Acceso al CRM" };

/** Nombres de los centros activos (lectura pública por RLS), en el mismo orden que la web. */
async function nombresCentros() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("centros")
      .select("nombre")
      .eq("activo", true)
      .order("aforo", { ascending: false })
      .returns<{ nombre: string }[]>();
    return (data ?? []).map((c) => sinMarca(c.nombre));
  } catch {
    return [];
  }
}

export default async function PaginaAcceso({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const [{ siguiente }, centros] = await Promise.all([searchParams, nombresCentros()]);

  return (
    <main className="flex min-h-dvh flex-col px-4 py-6">
      <div className="flex justify-end">
        <InterruptorTema />
      </div>

      <div className="m-auto w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-acento text-xs font-bold text-sobre-campo">{inicialesMarca}</span>
          <span className="text-base font-semibold tracking-tight">{MARCA.nombre} CRM</span>
        </div>

        <div className="rounded-xl border border-linea bg-placa p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">Inicia sesión</h1>
          <p className="mt-1.5 text-sm text-tinta-2">Usa la cuenta de equipo que te ha dado el club.</p>
          <FormularioAcceso siguiente={siguiente} />
        </div>

        <p className="mt-6 text-center text-xs text-tinta-2">
          {centros.length > 0 && `${centros.join(" · ")} · `}
          <Link href="/" className="underline-offset-4 hover:text-tinta hover:underline">
            Web pública
          </Link>
        </p>
      </div>
    </main>
  );
}
