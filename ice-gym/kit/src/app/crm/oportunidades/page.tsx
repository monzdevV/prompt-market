import type { Metadata } from "next";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { catalogos } from "@/lib/datos/b2b";
import { listarOportunidades, totalesAbiertas } from "@/lib/datos/oportunidades";
import { dinero, numero } from "@/lib/formato";
import { claseBotonPrincipal } from "@/components/crm/Primitivas";
import { NuevaOportunidad } from "@/components/crm/oportunidades/NuevaOportunidad";
import { VistaOportunidades } from "@/components/crm/oportunidades/VistaOportunidades";
import { cuantosFiltros, leerFiltros } from "@/components/crm/oportunidades/filtros";

export const metadata: Metadata = { title: "Oportunidades" };
export const dynamic = "force-dynamic";

export default async function PaginaOportunidades({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = leerFiltros(await searchParams);
  const [filas, cats] = await Promise.all([listarOportunidades(filtros), catalogos()]);

  let hayAlguna = filas.length > 0;
  if (!hayAlguna && cuantosFiltros(filtros) > 0) {
    const supabase = await createClient();
    const { count } = await supabase.from("oportunidades").select("id", { count: "exact", head: true });
    hayAlguna = (count ?? 0) > 0;
  }

  const t = totalesAbiertas(filas);

  return (
    // En escritorio la pantalla queda fija: ocupa justo el alto de la ventana
    // (aquí no hay barra superior en escritorio) y solo hacen scroll las columnas del Kanban o el cuerpo de la tabla.
    // En móvil se deja el scroll de página: cabecera + filtros + barra inferior
    // dejarían el tablero en media pantalla; ahí cada columna ya scrollea por
    // dentro (max-h) y el tablero se desliza en horizontal con snap.
    // Crear oportunidades se hace desde «Crear», arriba: un solo botón para todo.
    <main className="flex flex-col px-4 pb-10 md:h-dvh md:overflow-hidden md:px-8 md:pb-4 md:pt-5">
      <VistaOportunidades
        filas={filas}
        catalogos={cats}
        hayAlguna={hayAlguna}
        cifras={[
          { etiqueta: "Abiertas", valor: numero(t.n) },
          { etiqueta: "Pipeline", valor: dinero(t.valor) },
          { etiqueta: "Valor esperado", valor: dinero(t.esperado) },
        ]}
        accionVacia={
          <NuevaOportunidad catalogos={cats}>
            <button type="button" className={`${claseBotonPrincipal} mt-2`}>
              <Plus className="size-4" weight="bold" aria-hidden />
              Crear la primera oportunidad
            </button>
          </NuevaOportunidad>
        }
      />
    </main>
  );
}
