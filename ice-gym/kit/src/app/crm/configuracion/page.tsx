import type { Metadata } from "next";
import {
  ArrowsClockwise,
  Bell,
  CheckSquare,
  EnvelopeSimple,
  NotePencil,
  Phone,
  SignOut,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { listarEquipo } from "@/lib/datos/b2b";
import { usuarioActual } from "@/lib/datos/interacciones";
import {
  DIRECCION_TIPO,
  ETAPAS,
  ETIQUETA_ETAPA,
  ETIQUETA_INTERACCION,
  ETIQUETA_SECTOR,
  ETIQUETA_TIPO_EMPRESA,
  PROBABILIDAD_POR_ETAPA,
  SECTORES,
  TIPOS_EMPRESA,
  TIPOS_INTERACCION,
  TIPOS_OPORTUNIDAD,
  TONO_DIRECCION,
  TONO_ETAPA,
  TONO_INTERACCION,
  TONO_TIPO_EMPRESA,
  esEtapaAbierta,
  nombreCompleto,
  tonoColor,
  type Etapa,
  type TipoInteraccion,
} from "@/lib/b2b";
import { dinero, numero } from "@/lib/formato";
import { Encabezado, Seccion } from "@/components/crm/Primitivas";
import { Avatar, BadgeTipoOportunidad, Tag } from "@/components/crm/b2b/Piezas";
import { InterruptorTema } from "@/components/crm/InterruptorTema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { salir } from "@/app/crm/acciones/sesion";
import { GestionEquipo } from "./GestionEquipo";

export const metadata: Metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

const PESTANAS = [
  { valor: "equipo", texto: "Equipo" },
  { valor: "pipeline", texto: "Pipeline" },
  { valor: "catalogos", texto: "Catálogos" },
  { valor: "cuenta", texto: "Cuenta" },
] as const;

const ICONO: Record<TipoInteraccion, typeof Phone> = {
  llamada: Phone,
  email: EnvelopeSimple,
  reunion: UsersThree,
  nota: NotePencil,
  tarea: CheckSquare,
  seguimiento: Bell,
  cambio_etapa: ArrowsClockwise,
};

const TEXTO_DIRECCION = { venta: "Venta · entra dinero", compra: "Compra · sale dinero", alianza: "Alianza" } as const;

async function resumenPipeline() {
  const supabase = await createClient();
  const { data } = await supabase.from("oportunidades").select("etapa, valor").limit(5000);
  const r = Object.fromEntries(ETAPAS.map((e) => [e, { n: 0, valor: 0 }])) as Record<Etapa, { n: number; valor: number }>;
  for (const o of (data ?? []) as { etapa: Etapa; valor: number }[]) {
    if (!r[o.etapa]) continue;
    r[o.etapa].n += 1;
    r[o.etapa].valor += Number(o.valor) || 0;
  }
  return r;
}

export default async function PaginaConfiguracion({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const inicial = PESTANAS.some((p) => p.valor === tab) ? tab! : "equipo";
  const [equipo, { email, miembro }, pipeline] = await Promise.all([listarEquipo(), usuarioActual(), resumenPipeline()]);

  const disparador =
    "h-9 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-sm font-medium text-tinta-2 shadow-none hover:text-tinta data-[state=active]:border-acento-tinta data-[state=active]:bg-transparent data-[state=active]:text-tinta data-[state=active]:shadow-none";

  return (
    <main className="flex flex-col px-4 pb-10 lg:px-8">
      <Encabezado titulo="Configuración" meta="Equipo, pipeline, catálogos y tu cuenta." className="px-0 lg:px-0" />

      <Tabs defaultValue={inicial} className="gap-5">
        <TabsList variant="line" className="-mx-4 h-auto w-auto justify-start gap-1 overflow-x-auto rounded-none p-0 px-4 lg:-mx-8 lg:px-8">
          {PESTANAS.map((p) => (
            <TabsTrigger key={p.valor} value={p.valor} className={disparador}>
              {p.texto}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="equipo" className="max-w-3xl">
          <GestionEquipo equipo={equipo} emailActual={email} />
        </TabsContent>

        <TabsContent value="pipeline" className="flex max-w-3xl flex-col gap-4">
          <p className="text-sm text-tinta-2">
            Etapas por las que pasa cualquier oportunidad (venta, compra o alianza). Al mover una tarjeta en el Kanban, la probabilidad
            se ajusta a la de su etapa; luego se puede afinar a mano en cada oportunidad.
          </p>
          <ol className="overflow-hidden rounded-2xl bg-placa shadow-placa">
            {ETAPAS.map((e, n) => {
              const p = PROBABILIDAD_POR_ETAPA[e];
              return (
                <li key={e} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-linea/70 px-4 py-3 last:border-0 sm:grid-cols-[1.5rem_12rem_minmax(0,1fr)_9rem]">
                  <span className="text-xs tabular-nums text-tinta-2">{n + 1}</span>
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: TONO_ETAPA[e] }} aria-hidden />
                    <span className="text-sm font-medium text-tinta">{ETIQUETA_ETAPA[e]}</span>
                    <span className="text-xs text-tinta-2">{esEtapaAbierta(e) ? "Abierta" : "Cerrada"}</span>
                  </span>
                  <span className="hidden items-center gap-2.5 sm:flex" aria-label={`Probabilidad por defecto ${p} %`}>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-placa-2">
                      <span className="block h-full rounded-full" style={{ width: `${p}%`, background: TONO_ETAPA[e] }} />
                    </span>
                    <span className="w-10 text-right text-sm tabular-nums text-tinta">{p}%</span>
                  </span>
                  <span className="text-right text-xs tabular-nums text-tinta-2">
                    {numero(pipeline[e].n)} · {dinero(pipeline[e].valor)}
                  </span>
                </li>
              );
            })}
          </ol>
        </TabsContent>

        <TabsContent value="catalogos" className="grid gap-4 lg:grid-cols-2">
          <Seccion titulo="Tipos de oportunidad" extra={<span className="text-xs text-tinta-2">{TIPOS_OPORTUNIDAD.length}</span>}>
            <ul className="flex flex-col gap-2">
              {TIPOS_OPORTUNIDAD.map((t) => (
                <li key={t} className="flex items-center justify-between gap-3">
                  <BadgeTipoOportunidad tipo={t} />
                  <span className="flex items-center gap-1.5 text-xs text-tinta-2">
                    <span className="size-2 rounded-full" style={{ background: TONO_DIRECCION[DIRECCION_TIPO[t]] }} aria-hidden />
                    {TEXTO_DIRECCION[DIRECCION_TIPO[t]]}
                  </span>
                </li>
              ))}
            </ul>
          </Seccion>
          <div className="flex flex-col gap-4">
            <Seccion titulo="Tipos de empresa" extra={<span className="text-xs text-tinta-2">{TIPOS_EMPRESA.length}</span>}>
              <div className="flex flex-wrap gap-1.5">
                {TIPOS_EMPRESA.map((t) => (
                  <Tag key={t} tono={TONO_TIPO_EMPRESA[t]}>
                    {ETIQUETA_TIPO_EMPRESA[t]}
                  </Tag>
                ))}
              </div>
            </Seccion>
            <Seccion titulo="Tipos de actividad" extra={<span className="text-xs text-tinta-2">{TIPOS_INTERACCION.length}</span>}>
              <ul className="grid grid-cols-2 gap-2">
                {TIPOS_INTERACCION.map((t) => {
                  const Icono = ICONO[t];
                  return (
                    <li key={t} className="flex items-center gap-2 text-sm text-tinta">
                      <span className="grid size-6 place-items-center rounded-full text-sobre-relleno" style={{ background: TONO_INTERACCION[t] }} aria-hidden>
                        <Icono className="size-3.5" weight="bold" />
                      </span>
                      {ETIQUETA_INTERACCION[t]}
                    </li>
                  );
                })}
              </ul>
            </Seccion>
          </div>
          <Seccion titulo="Sectores" extra={<span className="text-xs text-tinta-2">{SECTORES.length}</span>} className="lg:col-span-2">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-tinta sm:grid-cols-3 lg:grid-cols-4">
              {SECTORES.map((s) => (
                <li key={s} className="truncate">
                  {ETIQUETA_SECTOR[s]}
                </li>
              ))}
            </ul>
          </Seccion>
          <p className="text-xs text-tinta-2 lg:col-span-2">Los catálogos son fijos en esta versión; si necesitas uno nuevo, se añade en el código.</p>
        </TabsContent>

        <TabsContent value="cuenta" className="flex max-w-xl flex-col gap-4">
          <Seccion titulo="Tu cuenta">
            <div className="flex items-center gap-3">
              {miembro ? (
                <Avatar nombre={miembro.nombre} apellidos={miembro.apellidos} tono={tonoColor(miembro.color)} tamano="md" />
              ) : (
                <Avatar nombre={email ?? "?"} tamano="md" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-tinta">{miembro ? nombreCompleto(miembro) : "Sin ficha en el equipo"}</p>
                <p className="truncate text-[0.8125rem] text-tinta-2">{email}</p>
              </div>
            </div>
            {!miembro && (
              <p className="mt-3 text-[0.8125rem] text-tinta-2">
                Añádete en <span className="font-medium text-tinta">Equipo</span> con este email para poder filtrar «Mis tareas».
              </p>
            )}
          </Seccion>
          <Seccion titulo="Apariencia">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-tinta">Tema claro u oscuro</p>
                <p className="text-[0.8125rem] text-tinta-2">Se recuerda en este navegador.</p>
              </div>
              <span className="rounded-md bg-placa-2">
                <InterruptorTema />
              </span>
            </div>
          </Seccion>
          <Seccion titulo="Sesión">
            <form action={salir} className="flex items-center justify-between gap-3">
              <p className="text-[0.8125rem] text-tinta-2">Cierra la sesión en este dispositivo.</p>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-placa-2 px-4 text-sm font-medium text-tinta transition-colors hover:bg-linea"
              >
                <SignOut className="size-4" aria-hidden />
                Cerrar sesión
              </button>
            </form>
          </Seccion>
        </TabsContent>
      </Tabs>
    </main>
  );
}
