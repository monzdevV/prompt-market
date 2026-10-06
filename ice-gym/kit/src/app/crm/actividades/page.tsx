import type { Metadata } from "next";
import { Bell, CalendarCheck, EnvelopeSimple, Lightning, Phone, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { catalogos } from "@/lib/datos/b2b";
import { listarInteracciones, opcionesOportunidades, resumenActividad } from "@/lib/datos/interacciones";
import { ESTADOS_INTERACCION, TIPOS_INTERACCION, TONO_INTERACCION, incluye, ruta } from "@/lib/b2b";
import { numero } from "@/lib/formato";
import { Encabezado, Seccion } from "@/components/crm/Primitivas";
import { Cifra } from "@/components/crm/actividad/Cifras";
import { FiltrosActividad, type ValoresFiltroActividad } from "@/components/crm/actividad/FiltrosActividad";
import { LineaTemporal } from "@/components/crm/actividad/LineaTemporal";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";
import { TablaActividades } from "@/components/crm/actividad/TablaActividades";

export const metadata: Metadata = { title: "Actividades" };
export const dynamic = "force-dynamic";

const LIMITE = 300;
const esFecha = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const esUuid = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : "");

export default async function PaginaActividades({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const valores: ValoresFiltroActividad = {
    tipo: incluye(TIPOS_INTERACCION, sp.tipo) ? sp.tipo : "",
    responsable: esUuid(sp.responsable),
    empresa: esUuid(sp.empresa),
    estado: incluye(ESTADOS_INTERACCION, sp.estado) ? sp.estado : "",
    desde: esFecha(sp.desde),
    hasta: esFecha(sp.hasta),
    vista: sp.vista === "tabla" ? "tabla" : "linea",
  };

  const [items, resumen, cat, oportunidades] = await Promise.all([
    listarInteracciones({
      tipos: incluye(TIPOS_INTERACCION, valores.tipo) ? [valores.tipo] : undefined,
      responsableId: valores.responsable || undefined,
      empresaId: valores.empresa || undefined,
      estado: incluye(ESTADOS_INTERACCION, valores.estado) ? valores.estado : undefined,
      desde: valores.desde || undefined,
      hasta: valores.hasta || undefined,
      limite: LIMITE,
    }),
    resumenActividad(),
    catalogos(),
    opcionesOportunidades(),
  ]);

  const s = resumen.semana;
  const hayFiltros = Object.entries(valores).some(([k, v]) => k !== "vista" && v);

  return (
    <main className="flex flex-col gap-5 px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Actividades"
        meta="Seguimiento comercial: llamadas, emails, reuniones, notas y tareas de todo el equipo."
        className="px-0 pb-0 lg:px-0"
      >
        <NuevaInteraccion catalogos={cat} oportunidades={oportunidades} tipo="tarea">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-placa px-3 text-sm font-medium text-tinta shadow-placa transition-colors hover:bg-placa-2"
          >
            Nueva tarea
          </button>
        </NuevaInteraccion>
        <NuevaInteraccion catalogos={cat} oportunidades={oportunidades} />
      </Encabezado>

      <section aria-label="Resumen de la semana" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Cifra
          etiqueta="Esta semana"
          valor={numero(resumen.totalSemana)}
          detalle={`${numero(s.nota)} notas · ${numero(s.cambio_etapa)} cambios de etapa`}
          icono={<Lightning className="size-3.5" weight="bold" />}
          tono="var(--relleno-gris)"
        />
        <Cifra
          etiqueta="Llamadas"
          valor={numero(s.llamada)}
          detalle="desde el lunes"
          icono={<Phone className="size-3.5" weight="bold" />}
          tono={TONO_INTERACCION.llamada}
          href={`${ruta.actividades}?tipo=llamada`}
        />
        <Cifra
          etiqueta="Reuniones"
          valor={numero(s.reunion)}
          detalle="desde el lunes"
          icono={<UsersThree className="size-3.5" weight="bold" />}
          tono={TONO_INTERACCION.reunion}
          href={`${ruta.actividades}?tipo=reunion`}
        />
        <Cifra
          etiqueta="Emails"
          valor={numero(s.email)}
          detalle="desde el lunes"
          icono={<EnvelopeSimple className="size-3.5" weight="bold" />}
          tono={TONO_INTERACCION.email}
          href={`${ruta.actividades}?tipo=email`}
        />
        <Cifra
          etiqueta="Próximos 7 días"
          valor={numero(resumen.proximos)}
          detalle="tareas y seguimientos"
          icono={<CalendarCheck className="size-3.5" weight="bold" />}
          tono={TONO_INTERACCION.seguimiento}
          href={`${ruta.tareas}?vista=proximas`}
        />
        <Cifra
          etiqueta="Vencidas"
          valor={numero(resumen.vencidas)}
          detalle={resumen.vencidas ? "sin completar" : "todo al día"}
          icono={<Bell className="size-3.5" weight="bold" />}
          tono="var(--critico)"
          alerta={resumen.vencidas > 0}
          href={`${ruta.tareas}?vista=vencidas`}
        />
      </section>

      <FiltrosActividad valores={valores} equipo={cat.equipo} empresas={cat.empresas} />

      {valores.vista === "tabla" ? (
        <TablaActividades items={items} />
      ) : (
        <Seccion
          titulo={hayFiltros ? "Actividad filtrada" : "Toda la actividad"}
          extra={
            <span className="text-xs tabular-nums text-tinta-2">
              {items.length >= LIMITE ? `Últimas ${numero(LIMITE)}` : `${numero(items.length)} registros`}
            </span>
          }
        >
          <LineaTemporal
            items={items}
            filtrar={!valores.tipo}
            vacio={hayFiltros ? "Nada con estos filtros." : "Todavía no hay actividad registrada."}
            accionVacia={<NuevaInteraccion catalogos={cat} oportunidades={oportunidades} />}
          />
        </Seccion>
      )}
    </main>
  );
}
