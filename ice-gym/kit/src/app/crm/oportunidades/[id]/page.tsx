import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EnvelopeSimple, Phone, Plus } from "@phosphor-icons/react/dist/ssr";
import { catalogos } from "@/lib/datos/b2b";
import { obtenerOportunidad } from "@/lib/datos/oportunidades";
import { listarInteracciones } from "@/lib/datos/interacciones";
import {
  ETIQUETA_ESTADO_OPORTUNIDAD,
  ETIQUETA_ETAPA,
  ETIQUETA_ORIGEN_B2B,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_TIPO_EMPRESA,
  ETIQUETA_TIPO_OPORTUNIDAD,
  esEtapaAbierta,
  etiquetaSector,
  probabilidadB2B,
  ruta,
  valorEsperado,
} from "@/lib/b2b";
import { dinero, fecha, relativo } from "@/lib/formato";
import { Seccion } from "@/components/crm/Primitivas";
import {
  BadgeEtapa,
  BadgePrioridad,
  BadgeTipoOportunidad,
  Dato,
  EnlaceContacto,
  EnlaceEmpresa,
  LogoEmpresa,
  Responsable,
  Tag,
} from "@/components/crm/b2b/Piezas";
import { LineaTemporal } from "@/components/crm/actividad/LineaTemporal";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";
import { ProveedorAcciones } from "@/components/crm/oportunidades/Acciones";
import { AccionesFicha, NotasEditables, SelectorEtapa, TareasPendientes } from "@/components/crm/oportunidades/ControlesFicha";
import { Probabilidad, ProximaAccion } from "@/components/crm/oportunidades/Piezas";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await obtenerOportunidad(id);
  return { title: o?.nombre ?? "Oportunidad" };
}

const enlace = "inline-flex min-w-0 items-center gap-1.5 text-sm text-acento-tinta hover:underline";

export default async function PaginaOportunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, cats, interacciones] = await Promise.all([
    obtenerOportunidad(id),
    catalogos(),
    listarInteracciones({ oportunidadId: id, limite: 200 }),
  ]);
  if (!o) notFound();

  const tareas = interacciones
    .filter((i) => i.estado === "pendiente" && (i.tipo === "tarea" || i.tipo === "seguimiento"))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const prob = probabilidadB2B(o);
  const abierta = esEtapaAbierta(o.etapa);
  const telefono = o.contacto?.telefono?.replace(/\s/g, "");
  const botonMini =
    "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.8125rem] font-medium text-acento-tinta hover:bg-placa-2";

  return (
    <ProveedorAcciones catalogos={cats}>
      <main className="px-4 pb-12 pt-5 lg:px-8">
        <Link href={ruta.oportunidades} className="inline-flex items-center gap-1.5 text-[0.8125rem] text-tinta-2 hover:text-tinta">
          <ArrowLeft className="size-4" aria-hidden />
          Oportunidades
        </Link>

        {/* Cabecera */}
        <header className="mt-3 flex flex-col gap-5 border-b border-linea pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              {o.empresa && <LogoEmpresa nombre={o.empresa.nombre} url={o.empresa.logo_url} tamano="lg" />}
              <div className="flex min-w-0 flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-tinta">{o.nombre}</h1>
                <div className="flex flex-wrap items-center gap-1.5">
                  <BadgeEtapa etapa={o.etapa} />
                  <BadgeTipoOportunidad tipo={o.tipo} />
                  <BadgePrioridad prioridad={o.prioridad} />
                  <Tag tono={o.estado === "en_pausa" ? "var(--relleno-ambar)" : "var(--relleno-gris)"}>
                    {ETIQUETA_ESTADO_OPORTUNIDAD[o.estado]}
                  </Tag>
                  {o.empresa && (
                    <span className="ml-1 text-sm text-tinta-2">
                      con <EnlaceEmpresa e={o.empresa} conLogo={false} />
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-end gap-6">
              <div className="flex flex-col items-end">
                <span className="text-xs text-tinta-2">Valor</span>
                <span className="text-2xl font-semibold tabular-nums text-tinta">{dinero(o.valor)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-tinta-2">Esperado ({prob}%)</span>
                <span className="text-lg font-medium tabular-nums text-tinta-2">{dinero(valorEsperado(o))}</span>
              </div>
            </div>
          </div>

          <SelectorEtapa o={o} />
          <AccionesFicha o={o} catalogos={cats} />

          {o.etapa === "perdida" && o.motivo_perdida && (
            <p className="rounded-lg border border-alarma/30 bg-alarma/10 px-3 py-2 text-sm text-alarma-tinta">
              <span className="font-medium">Motivo de pérdida:</span> {o.motivo_perdida}
            </p>
          )}
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Columna principal */}
          <div className="flex min-w-0 flex-col gap-5">
            <Seccion titulo="Información comercial" id="info-comercial">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Dato etiqueta="Nombre">{o.nombre}</Dato>
                <Dato etiqueta="Tipo">{ETIQUETA_TIPO_OPORTUNIDAD[o.tipo]}</Dato>
                <Dato etiqueta="Etapa">{ETIQUETA_ETAPA[o.etapa]}</Dato>
                <Dato etiqueta="Valor">
                  <span className="font-medium tabular-nums">{dinero(o.valor)}</span>
                </Dato>
                <Dato etiqueta="Probabilidad">
                  <Probabilidad o={o} ancho="w-20" />
                </Dato>
                <Dato etiqueta="Cierre estimado">
                  {o.fecha_cierre ? (
                    <span className="tabular-nums">
                      {fecha(o.fecha_cierre)} <span className="text-tinta-2">({relativo(o.fecha_cierre)})</span>
                    </span>
                  ) : null}
                </Dato>
                <Dato etiqueta="Prioridad">{ETIQUETA_PRIORIDAD[o.prioridad]}</Dato>
                <Dato etiqueta="Responsable">
                  <Responsable m={o.responsable} />
                </Dato>
                <Dato etiqueta="Origen">{ETIQUETA_ORIGEN_B2B[o.origen]}</Dato>
                <Dato etiqueta="Estado">{ETIQUETA_ESTADO_OPORTUNIDAD[o.estado]}</Dato>
                <Dato etiqueta="Creada">
                  <span className="tabular-nums">{fecha(o.created_at)}</span>
                </Dato>
                <Dato etiqueta="Última actualización">{relativo(o.updated_at)}</Dato>
              </dl>
            </Seccion>

            <Seccion titulo="Información adicional" id="info-adicional">
              <div className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-1 text-xs font-medium text-tinta-2">Descripción</h3>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-tinta">
                      {o.descripcion ?? <span className="text-tinta-2">Sin descripción.</span>}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-1 text-xs font-medium text-tinta-2">Necesidad detectada</h3>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-tinta">
                      {o.necesidad ?? <span className="text-tinta-2">Sin anotar.</span>}
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-1.5 text-xs font-medium text-tinta-2">Próximo paso</h3>
                    {abierta || o.proxima_accion ? <ProximaAccion o={o} /> : <span className="text-sm text-tinta-2">Oportunidad cerrada.</span>}
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-xs font-medium text-tinta-2">Fecha de seguimiento</h3>
                    <p className="text-sm tabular-nums text-tinta">
                      {o.proxima_accion_fecha ? `${fecha(o.proxima_accion_fecha)} (${relativo(o.proxima_accion_fecha)})` : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-1.5 text-xs font-medium text-tinta-2">Notas</h3>
                  <NotasEditables id={o.id} notas={o.notas} />
                </div>
              </div>
            </Seccion>

            <Seccion
              titulo="Seguimiento"
              id="seguimiento"
              extra={
                <NuevaInteraccion
                  catalogos={cats}
                  oportunidadId={o.id}
                  empresaId={o.empresa_id ?? undefined}
                  contactoId={o.contacto_id ?? undefined}
                >
                  <button type="button" className={botonMini}>
                    <Plus className="size-3.5" weight="bold" aria-hidden />
                    Registrar
                  </button>
                </NuevaInteraccion>
              }
            >
              <LineaTemporal
                items={interacciones}
                vacio="Todavía no hay actividad. Registra la primera llamada, email o reunión."
              />
            </Seccion>
          </div>

          {/* Lateral */}
          <aside className="flex min-w-0 flex-col gap-5">
            <Seccion titulo="Empresa relacionada" id="empresa">
              {o.empresa || o.contacto ? (
                <div className="flex flex-col gap-4">
                  {o.empresa && (
                    <div className="flex items-center gap-3">
                      <LogoEmpresa nombre={o.empresa.nombre} url={o.empresa.logo_url} tamano="md" />
                      <div className="flex min-w-0 flex-col">
                        <Link href={ruta.empresa(o.empresa.id)} className="truncate font-medium text-tinta hover:underline">
                          {o.empresa.nombre}
                        </Link>
                        <span className="truncate text-xs text-tinta-2">
                          {ETIQUETA_TIPO_EMPRESA[o.empresa.tipo]} · {etiquetaSector(o.empresa.sector)}
                        </span>
                      </div>
                    </div>
                  )}
                  <dl className="grid gap-3.5 border-t border-linea pt-4">
                    <Dato etiqueta="Contacto principal">
                      <EnlaceContacto c={o.contacto} />
                    </Dato>
                    <Dato etiqueta="Cargo">{o.contacto?.cargo ?? null}</Dato>
                    <Dato etiqueta="Email">
                      {o.contacto?.email ? (
                        <a href={`mailto:${o.contacto.email}`} className={enlace}>
                          <EnvelopeSimple className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">{o.contacto.email}</span>
                        </a>
                      ) : null}
                    </Dato>
                    <Dato etiqueta="Teléfono">
                      {o.contacto?.telefono ? (
                        <a href={`tel:${telefono}`} className={enlace}>
                          <Phone className="size-4 shrink-0" aria-hidden />
                          <span className="tabular-nums">{o.contacto.telefono}</span>
                        </a>
                      ) : null}
                    </Dato>
                  </dl>
                </div>
              ) : (
                <p className="text-sm text-tinta-2">Sin empresa ni contacto. Asígnalos desde «Editar».</p>
              )}
            </Seccion>

            <Seccion
              titulo={`Tareas pendientes${tareas.length ? ` (${tareas.length})` : ""}`}
              id="tareas"
              extra={
                <NuevaInteraccion
                  catalogos={cats}
                  oportunidadId={o.id}
                  empresaId={o.empresa_id ?? undefined}
                  contactoId={o.contacto_id ?? undefined}
                  tipo="tarea"
                >
                  <button type="button" className={botonMini}>
                    <Plus className="size-3.5" weight="bold" aria-hidden />
                    Tarea
                  </button>
                </NuevaInteraccion>
              }
            >
              <TareasPendientes tareas={tareas} />
            </Seccion>
          </aside>
        </div>
      </main>
    </ProveedorAcciones>
  );
}
