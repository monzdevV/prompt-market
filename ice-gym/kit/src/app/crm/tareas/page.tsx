import type { Metadata } from "next";
import { catalogos } from "@/lib/datos/b2b";
import { contarTareasPendientes, listarTareas, opcionesOportunidades, usuarioActual } from "@/lib/datos/interacciones";
import { PRIORIDADES, incluye } from "@/lib/b2b";
import { numero } from "@/lib/formato";
import { Encabezado } from "@/components/crm/Primitivas";
import { ListaTareas, type VistaTareas } from "@/components/crm/actividad/ListaTareas";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";

export const metadata: Metadata = { title: "Tareas" };
export const dynamic = "force-dynamic";

const VISTAS: readonly VistaTareas[] = ["vencidas", "hoy", "proximas", "completadas"];
const esUuid = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : "");

function contarVencidas(tareas: { estado: string; fecha: string }[], ahora = Date.now()) {
  return tareas.filter((t) => t.estado === "pendiente" && new Date(t.fecha).getTime() < ahora).length;
}

export default async function PaginaTareas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [{ miembro }, cat, oportunidades] = await Promise.all([usuarioActual(), catalogos(), opcionesOportunidades()]);

  const de: "mias" | "todas" = sp.de === "mias" && miembro ? "mias" : "todas";
  const valores = {
    vista: (incluye(VISTAS, sp.vista) ? sp.vista : "") as VistaTareas | "",
    responsable: de === "mias" ? "" : esUuid(sp.responsable),
    prioridad: incluye(PRIORIDADES, sp.prioridad) ? sp.prioridad : "",
    de,
  };
  const responsableId = de === "mias" ? miembro!.id : valores.responsable || undefined;

  const [tareas, pendientesTotal, mias] = await Promise.all([
    listarTareas({ responsableId, prioridad: incluye(PRIORIDADES, valores.prioridad) ? valores.prioridad : undefined }),
    contarTareasPendientes(),
    miembro ? contarTareasPendientes(miembro.id) : Promise.resolve(0),
  ]);
  const vencidas = contarVencidas(tareas);

  const nueva = (
    <NuevaInteraccion catalogos={cat} oportunidades={oportunidades} tipo="tarea" responsableId={miembro?.id} />
  );

  return (
    <main className="flex flex-col gap-4 px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Tareas"
        meta={
          <span>
            <span className="font-medium tabular-nums text-tinta">{numero(pendientesTotal)}</span> pendientes en el equipo
            {miembro && (
              <>
                {" · "}
                <span className="font-medium tabular-nums text-tinta">{numero(mias)}</span> tuyas
              </>
            )}
            {vencidas > 0 && (
              <>
                {" · "}
                <span className="font-medium tabular-nums text-critico">{numero(vencidas)} vencidas</span>
                {valores.responsable || de === "mias" || valores.prioridad ? " en esta vista" : ""}
              </>
            )}
          </span>
        }
        className="px-0 pb-1 lg:px-0"
      >
        {nueva}
      </Encabezado>

      <ListaTareas items={tareas} equipo={cat.equipo} miembroId={miembro?.id ?? null} valores={valores} nueva={nueva} />
    </main>
  );
}
