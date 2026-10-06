import type { Metadata } from "next";
import { MARCA } from "@/marca";
import Link from "next/link";
import { cargarDashboard } from "@/lib/datos/dashboard";
import { ruta } from "@/lib/b2b";
import { dinero, numero, porcentaje } from "@/lib/formato";
import { Encabezado, claseEnlace } from "@/components/crm/Primitivas";
import { Atencion, Metrica, MiniDato, Resumen, Tarjeta } from "@/components/crm/dashboard/Kpi";
import { FiltrosDashboard } from "@/components/crm/dashboard/FiltrosDashboard";
import {
  GraficoCreadas,
  GraficoEmbudo,
  GraficoGanadasPerdidas,
  GraficoPipeline,
  GraficoTipos,
} from "@/components/crm/dashboard/Graficos";
import { ActividadReciente, ProximosSeguimientos, TopEmpresas, TopOportunidades } from "@/components/crm/dashboard/Listas";
import { ETIQUETA_PERIODO_DASHBOARD, periodoValido } from "@/components/crm/dashboard/filtros";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const hoy = () =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: MARCA.zonaHoraria,
  }).format(new Date());

export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; responsable?: string }>;
}) {
  const sp = await searchParams;
  const periodo = periodoValido(sp.periodo);
  const responsableId = sp.responsable && /^[0-9a-f-]{36}$/i.test(sp.responsable) ? sp.responsable : undefined;
  const d = await cargarDashboard({ periodo, responsableId });
  const k = d.kpis;
  const textoPeriodo = ETIQUETA_PERIODO_DASHBOARD[periodo].toLowerCase();
  const responsable = responsableId ? d.equipo.find((m) => m.id === responsableId) : null;

  return (
    <main className="px-4 pb-12 md:px-8">
      <Encabezado
        titulo="Dashboard"
        meta={
          <span>
            <span className="inline-block first-letter:uppercase">{hoy()}</span>
            {responsable && <> · cartera de {responsable.nombre}</>}
          </span>
        }
        className="px-0 md:px-0"
      >
        <FiltrosDashboard periodo={periodo} responsable={responsableId ?? ""} equipo={d.equipo} />
      </Encabezado>

      <h2 className="sr-only">Indicadores</h2>
      <Resumen>
        <Metrica
          etiqueta="Pipeline abierto"
          valor={dinero(k.valorPipeline)}
          pie={`${numero(k.abiertas)} oportunidades abiertas`}
          href={ruta.oportunidades}
          delta={k.deltaPipeline}
          serie={d.porMes.map((m) => m.pipeline)}
        />
        <Metrica
          etiqueta="Valor esperado"
          valor={dinero(k.valorEsperado)}
          pie={k.valorPipeline > 0 ? `${porcentaje((k.valorEsperado / k.valorPipeline) * 100)} del pipeline, ponderado` : "Ponderado por probabilidad"}
          href={ruta.oportunidades}
        />
        <Metrica
          etiqueta="Ganadas"
          valor={numero(k.ganadas)}
          pie={`${dinero(k.valorGanado)} · ${textoPeriodo}`}
          href={`${ruta.oportunidades}?etapa=ganada`}
          serie={d.porMes.map((m) => m.ganadas)}
        />
        <Metrica
          etiqueta="Tasa de conversión"
          valor={k.conversion == null ? "—" : porcentaje(k.conversion)}
          pie={k.conversion == null ? "Sin cierres en el periodo" : `${numero(k.ganadas)} de ${numero(k.ganadas + k.perdidas)} cerradas`}
          href={ruta.oportunidades}
        />
      </Resumen>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-label="Requiere atención" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Atencion
            nivel={k.vencidas > 0 ? "error" : k.pendientes > 0 ? "aviso" : "ok"}
            titulo="Tareas"
            valor={numero(k.vencidas > 0 ? k.vencidas : k.pendientes)}
            texto={
              k.vencidas > 0
                ? `vencidas · ${numero(k.pendientes)} pendientes en total`
                : k.pendientes > 0
                  ? "pendientes, ninguna vencida"
                  : "Todo al día"
            }
            href={ruta.tareas}
          />
          <Atencion
            nivel={k.accionesVencidas > 0 ? "error" : "ok"}
            titulo="Próximas acciones"
            valor={numero(k.accionesVencidas)}
            texto={k.accionesVencidas > 0 ? "fuera de plazo en oportunidades abiertas" : "Ninguna fuera de plazo"}
            href={`${ruta.oportunidades}?vista=tabla&etapa=abiertas&orden=accion&dir=asc`}
          />
        </section>
        <section aria-label="Otros datos" className="grid grid-cols-2 gap-1 rounded-2xl bg-placa p-1.5 shadow-placa sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          <MiniDato etiqueta="Perdidas" valor={numero(k.perdidas)} pie={dinero(k.valorPerdido)} href={`${ruta.oportunidades}?etapa=perdida`} />
          <MiniDato etiqueta="Nuevas" valor={numero(k.creadasPeriodo)} pie={textoPeriodo} href={ruta.oportunidades} />
          <MiniDato
            etiqueta="Empresas activas"
            valor={numero(k.empresasActivas)}
            pie={`de ${numero(k.empresasTotal)}`}
            href={`${ruta.empresas}?estado=activa`}
          />
          <MiniDato etiqueta="Contactos" valor={numero(k.contactos)} href={ruta.contactos} />
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Tarjeta
          titulo="Embudo comercial"
          subtitulo={`Valor abierto por etapa · cerradas: ${textoPeriodo}`}
          className="xl:col-span-2"
          extra={
            <Link href={`${ruta.oportunidades}`} className={claseEnlace}>
              Ver tablero
            </Link>
          }
        >
          <GraficoEmbudo datos={d.porEtapa} />
        </Tarjeta>
        <Tarjeta titulo="Por tipo de oportunidad" subtitulo="Valor abierto">
          {d.porTipo.length > 0 ? (
            <GraficoTipos datos={d.porTipo} />
          ) : (
            <p className="py-6 text-center text-sm text-tinta-2">Sin oportunidades abiertas.</p>
          )}
        </Tarjeta>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Tarjeta
          titulo="Próximos seguimientos"
          subtitulo="Próximas acciones y tareas pendientes, las vencidas primero"
          extra={
            <Link href={ruta.tareas} className={claseEnlace}>
              Ver tareas
            </Link>
          }
        >
          <ProximosSeguimientos items={d.seguimientos} />
        </Tarjeta>
        <Tarjeta
          titulo="Oportunidades más grandes"
          subtitulo="Abiertas, por valor"
          extra={
            <Link href={ruta.oportunidades} className={claseEnlace}>
              Ver todas
            </Link>
          }
        >
          <TopOportunidades items={d.topOportunidades} />
        </Tarjeta>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Tarjeta titulo="Oportunidades creadas" subtitulo="Últimos 9 meses">
          <GraficoCreadas datos={d.porMes} />
        </Tarjeta>
        <Tarjeta titulo="Ganadas y perdidas" subtitulo="Cierres por mes">
          <GraficoGanadasPerdidas datos={d.porMes} />
        </Tarjeta>
        <Tarjeta titulo="Evolución del pipeline" subtitulo="Valor abierto a fin de mes" className="lg:col-span-2 xl:col-span-1">
          <GraficoPipeline datos={d.porMes} />
        </Tarjeta>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Tarjeta
          titulo="Actividad reciente"
          subtitulo="Llamadas, reuniones, emails y cambios de etapa"
          extra={
            <Link href={ruta.actividades} className={claseEnlace}>
              Ver actividad
            </Link>
          }
        >
          <ActividadReciente items={d.actividad} />
        </Tarjeta>
        <Tarjeta
          titulo="Empresas con más valor"
          subtitulo="Ganado y abierto"
          extra={
            <Link href={ruta.empresas} className={claseEnlace}>
              Ver empresas
            </Link>
          }
        >
          <TopEmpresas items={d.topEmpresas} />
        </Tarjeta>
      </div>
    </main>
  );
}
