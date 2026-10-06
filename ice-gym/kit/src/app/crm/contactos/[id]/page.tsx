import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  EnvelopeSimple,
  Globe,
  LinkedinLogo,
  NotePencil,
  Phone,
  Plus,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { obtenerContacto } from "@/lib/datos/contactos";
import { catalogos } from "@/lib/datos/b2b";
import { listarInteracciones } from "@/lib/datos/interacciones";
import {
  ETIQUETA_TIPO_CONTACTO,
  accionVencidaB2B,
  esEtapaAbierta,
  etiquetaSector,
  nombreCompleto,
  ruta,
} from "@/lib/b2b";
import { dinero, fecha, fechaHora, numero, relativo } from "@/lib/formato";
import { Seccion, SinDatos } from "@/components/crm/Primitivas";
import {
  Avatar,
  BadgeEstadoEmpresa,
  BadgeEtapa,
  BadgeInteraccion,
  BadgeTipoEmpresa,
  BadgeTipoOportunidad,
  Dato,
  EnlaceContacto,
  EnlaceEmpresa,
  EnlaceOportunidad,
  LogoEmpresa,
  Responsable,
} from "@/components/crm/b2b/Piezas";
import { NuevaOportunidad } from "@/components/crm/oportunidades/NuevaOportunidad";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";
import { LineaTemporal } from "@/components/crm/actividad/LineaTemporal";
import { NuevoContacto } from "@/components/crm/contactos/NuevoContacto";
import { BadgeTipoContacto, EstadoContactoMarca, MarcaPrincipal } from "@/components/crm/contactos/PiezasContacto";
import {
  CasillaTarea,
  EditarContacto,
  MasAcciones,
  NotasContacto,
  claseBotonSecundario,
} from "@/components/crm/contactos/ControlesContacto";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { contacto } = await obtenerContacto(id);
  return { title: contacto ? nombreCompleto(contacto) : "Contacto" };
}

const claseBotonAccion =
  "inline-flex h-8 items-center gap-1.5 rounded-md bg-acento px-3 text-[0.8125rem] font-medium text-sobre-campo shadow-sm transition-[filter] hover:brightness-110";

/** Momento de la petición (el componente se renderiza una vez en el servidor). */
const instante = () => Date.now();

const urlExterna = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default async function PaginaContacto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [{ contacto, otros, oportunidades, empresaAbiertas }, cat, interacciones] = await Promise.all([
    obtenerContacto(id),
    catalogos(),
    listarInteracciones({ contactoId: id, limite: 150 }),
  ]);
  if (!contacto) notFound();

  const empresa = contacto.empresa;
  const telefono = contacto.telefono?.replace(/\s/g, "");
  const ahora = instante();
  const tareas = interacciones
    .filter((i) => i.estado === "pendiente")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const historial = interacciones.filter((i) => i.estado !== "pendiente");
  const abiertas = oportunidades.filter((o) => esEtapaAbierta(o.etapa));
  const enJuego = abiertas.reduce((s, o) => s + Number(o.valor), 0);
  const ganado = oportunidades.filter((o) => o.etapa === "ganada").reduce((s, o) => s + Number(o.valor), 0);
  const ultima = historial[0];

  return (
    <main className="px-4 pb-12 pt-5 lg:px-8">
      <nav aria-label="Migas" className="flex items-center gap-1.5 text-[0.8125rem] text-tinta-2">
        <Link href={ruta.contactos} className="inline-flex items-center gap-1.5 hover:text-tinta">
          <ArrowLeft className="size-4" aria-hidden />
          Contactos
        </Link>
        {empresa && (
          <>
            <span aria-hidden>/</span>
            <Link href={ruta.empresa(empresa.id)} className="truncate hover:text-tinta">
              {empresa.nombre}
            </Link>
          </>
        )}
      </nav>

      {/* Cabecera */}
      <header className="mt-3 flex flex-col gap-4 pb-1 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar nombre={contacto.nombre} apellidos={contacto.apellidos} url={contacto.avatar_url} tamano="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-tinta">{nombreCompleto(contacto)}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-tinta-2">
              <span>{contacto.cargo ?? "Sin cargo"}</span>
              {empresa && (
                <>
                  <span aria-hidden>—</span>
                  <EnlaceEmpresa e={empresa} />
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <BadgeTipoContacto tipo={contacto.tipo} />
              <EstadoContactoMarca estado={contacto.estado} />
              {contacto.principal && <MarcaPrincipal conTexto />}
              {contacto.rol && <span className="text-xs text-tinta-2">· {contacto.rol}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {contacto.email && (
            <a href={`mailto:${contacto.email}`} className={claseBotonSecundario}>
              <EnvelopeSimple className="size-4" aria-hidden /> Email
            </a>
          )}
          {telefono && (
            <a href={`tel:${telefono}`} className={claseBotonSecundario}>
              <Phone className="size-4" aria-hidden /> Llamar
            </a>
          )}
          {contacto.linkedin && (
            <a href={urlExterna(contacto.linkedin)} target="_blank" rel="noopener noreferrer" className={claseBotonSecundario}>
              <LinkedinLogo className="size-4" aria-hidden /> LinkedIn
            </a>
          )}
          <NuevaInteraccion catalogos={cat} contactoId={contacto.id} empresaId={contacto.empresa_id ?? undefined}>
            <button type="button" className={claseBotonSecundario}>
              <NotePencil className="size-4" aria-hidden /> Registrar actividad
            </button>
          </NuevaInteraccion>
          <NuevaOportunidad catalogos={cat} contactoId={contacto.id} empresaId={contacto.empresa_id ?? undefined}>
            <button type="button" className={claseBotonAccion}>
              <Plus className="size-4" weight="bold" aria-hidden /> Nueva oportunidad
            </button>
          </NuevaOportunidad>
          <EditarContacto contacto={contacto} catalogos={cat} />
          <MasAcciones contacto={contacto} />
        </div>
      </header>

      {/* Cifras */}
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { k: "Oportunidades abiertas", v: numero(abiertas.length) },
          { k: "En juego", v: dinero(enJuego) },
          { k: "Ganado", v: dinero(ganado) },
          { k: "Último contacto", v: ultima ? relativo(ultima.fecha) : "Nunca" },
        ].map((c) => (
          <div key={c.k} className="min-w-0 rounded-2xl bg-placa px-4 py-3.5 shadow-placa">
            <dt className="text-[0.8125rem] text-tinta-2">{c.k}</dt>
            <dd className="cifra mt-1.5 truncate text-[1.75rem] text-tinta">{c.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Columna principal */}
        <div className="flex min-w-0 flex-col gap-5">
          {tareas.length > 0 && (
            <section
              aria-labelledby="tareas-pendientes"
              className="rounded-2xl bg-aviso-suave px-4 py-3.5"
            >
              <h2 id="tareas-pendientes" className="flex items-center gap-2 text-sm font-semibold text-tinta">
                <WarningCircle className="size-4 text-aviso" weight="fill" aria-hidden />
                Pendiente con {contacto.nombre}
                <span className="font-normal tabular-nums text-tinta-2">{tareas.length}</span>
              </h2>
              <ul className="mt-2 flex flex-col">
                {tareas.map((t) => {
                  const vencida = new Date(t.fecha).getTime() < ahora;
                  return (
                    <li key={t.id} className="flex items-start gap-3 py-2">
                      <CasillaTarea id={t.id} titulo={t.titulo} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-tinta">{t.titulo}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-2">
                          <BadgeInteraccion tipo={t.tipo} />
                          <span className={`tabular-nums ${vencida ? "font-medium text-critico" : ""}`}>
                            {vencida ? "Vencida · " : ""}
                            {fechaHora(t.fecha)}
                          </span>
                          {t.oportunidad && <EnlaceOportunidad o={t.oportunidad} />}
                        </p>
                      </div>
                      <Responsable m={t.responsable} soloAvatar />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <Seccion
            titulo="Oportunidades"
            id="oportunidades"
            extra={
              <NuevaOportunidad catalogos={cat} contactoId={contacto.id} empresaId={contacto.empresa_id ?? undefined}>
                <button type="button" className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-acento-tinta hover:underline">
                  <Plus className="size-3.5" weight="bold" aria-hidden /> Añadir
                </button>
              </NuevaOportunidad>
            }
          >
            {oportunidades.length === 0 ? (
              <p className="py-2 text-sm text-tinta-2">
                {contacto.nombre} no tiene oportunidades. Ábrele una de venta, compra, colaboración o partnership.
              </p>
            ) : (
              <div className="-m-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="text-[0.8125rem] text-tinta-2">
                      <th className="py-2 pl-4 pr-3 font-normal">Oportunidad</th>
                      <th className="py-2 pr-3 font-normal">Etapa</th>
                      <th className="py-2 pr-3 text-right font-normal">Valor</th>
                      <th className="py-2 pr-4 font-normal">Próxima acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oportunidades.map((o) => {
                      const vencida = accionVencidaB2B(o, ahora);
                      return (
                        <tr key={o.id} className="border-b border-linea/70 last:border-0 hover:bg-placa-2/50">
                          <td className="max-w-[260px] py-2.5 pl-4 pr-3">
                            <div className="flex min-w-0 flex-col gap-1">
                              <EnlaceOportunidad o={o} />
                              <span>
                                <BadgeTipoOportunidad tipo={o.tipo} />
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <BadgeEtapa etapa={o.etapa} />
                          </td>
                          <td className="py-2.5 pr-3 text-right text-sm font-medium tabular-nums text-tinta">
                            {Number(o.valor) > 0 ? dinero(o.valor) : <span className="text-tinta-2">—</span>}
                          </td>
                          <td className="max-w-[220px] py-2.5 pr-4 text-sm">
                            {o.proxima_accion || o.proxima_accion_fecha ? (
                              <span className="flex min-w-0 flex-col leading-tight">
                                <span className="truncate text-tinta">{o.proxima_accion ?? "Seguimiento"}</span>
                                {o.proxima_accion_fecha && (
                                  <span className={`tabular-nums ${vencida ? "font-medium text-critico" : "text-tinta-2"}`}>
                                    {vencida ? "Vencida · " : ""}
                                    {fecha(o.proxima_accion_fecha)}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-tinta-2">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>

          <Seccion
            titulo="Actividad"
            id="actividad"
            extra={
              <NuevaInteraccion catalogos={cat} contactoId={contacto.id} empresaId={contacto.empresa_id ?? undefined}>
                <button type="button" className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-acento-tinta hover:underline">
                  <Plus className="size-3.5" weight="bold" aria-hidden /> Registrar
                </button>
              </NuevaInteraccion>
            }
          >
            <LineaTemporal
              items={historial}
              vacio={`Aún no hay actividad con ${contacto.nombre}. Registra la primera llamada, email o reunión.`}
            />
          </Seccion>
        </div>

        {/* Lateral */}
        <div className="flex min-w-0 flex-col gap-5">
          <Seccion titulo="Datos del contacto" id="datos">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <Dato etiqueta="Nombre">{contacto.nombre}</Dato>
              <Dato etiqueta="Apellidos">{contacto.apellidos || null}</Dato>
              <Dato etiqueta="Cargo">{contacto.cargo}</Dato>
              <Dato etiqueta="Empresa">{empresa ? <EnlaceEmpresa e={empresa} /> : null}</Dato>
              <div className="col-span-2">
                <Dato etiqueta="Email">
                  {contacto.email ? (
                    <a href={`mailto:${contacto.email}`} className="break-all hover:underline">
                      {contacto.email}
                    </a>
                  ) : null}
                </Dato>
              </div>
              <Dato etiqueta="Teléfono">
                {telefono ? (
                  <a href={`tel:${telefono}`} className="tabular-nums hover:underline">
                    {contacto.telefono}
                  </a>
                ) : null}
              </Dato>
              <Dato etiqueta="LinkedIn">
                {contacto.linkedin ? (
                  <a href={urlExterna(contacto.linkedin)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    <LinkedinLogo className="size-4" aria-hidden /> Perfil
                  </a>
                ) : null}
              </Dato>
              <Dato etiqueta="Ciudad">{contacto.ciudad}</Dato>
              <Dato etiqueta="País">{contacto.pais}</Dato>
              <Dato etiqueta="Tipo de contacto">{ETIQUETA_TIPO_CONTACTO[contacto.tipo]}</Dato>
              <Dato etiqueta="Estado">
                <EstadoContactoMarca estado={contacto.estado} />
              </Dato>
              <Dato etiqueta="Responsable">
                <Responsable m={contacto.responsable} />
              </Dato>
              <Dato etiqueta="Alta">{fecha(contacto.created_at)}</Dato>
            </dl>
          </Seccion>

          <Seccion titulo="Notas" id="notas">
            <NotasContacto id={contacto.id} notas={contacto.notas} />
          </Seccion>

          {empresa ? (
            <Seccion
              titulo="Empresa"
              id="empresa"
              extra={
                <Link href={ruta.empresa(empresa.id)} className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-acento-tinta hover:underline">
                  Ver ficha <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              }
            >
              <div className="flex items-start gap-3">
                <LogoEmpresa nombre={empresa.nombre} url={empresa.logo_url} tamano="md" />
                <div className="min-w-0">
                  <Link href={ruta.empresa(empresa.id)} className="block truncate font-medium text-tinta hover:underline">
                    {empresa.nombre}
                  </Link>
                  <p className="truncate text-[0.8125rem] text-tinta-2">{etiquetaSector(empresa.sector)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <BadgeTipoEmpresa tipo={empresa.tipo} />
                    <BadgeEstadoEmpresa estado={empresa.estado} />
                  </div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <Dato etiqueta="Ubicación">{[empresa.ciudad, empresa.pais].filter(Boolean).join(", ") || null}</Dato>
                <Dato etiqueta="Oport. abiertas">
                  <Link href={ruta.empresa(empresa.id)} className="inline-flex items-center gap-1 tabular-nums hover:underline">
                    <Briefcase className="size-3.5 text-tinta-2" aria-hidden /> {numero(empresaAbiertas)}
                  </Link>
                </Dato>
                {empresa.web && (
                  <Dato etiqueta="Web">
                    <a href={urlExterna(empresa.web)} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 hover:underline">
                      <Globe className="size-3.5 shrink-0 text-tinta-2" aria-hidden />
                      <span className="truncate">{empresa.web.replace(/^https?:\/\/(www\.)?/, "")}</span>
                    </a>
                  </Dato>
                )}
                {empresa.telefono && (
                  <Dato etiqueta="Teléfono">
                    <a href={`tel:${empresa.telefono.replace(/\s/g, "")}`} className="tabular-nums hover:underline">
                      {empresa.telefono}
                    </a>
                  </Dato>
                )}
              </dl>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[0.8125rem] font-medium text-tinta">
                    Otros contactos <span className="font-normal tabular-nums text-tinta-2">{otros.length}</span>
                  </h3>
                  <NuevoContacto catalogos={cat} empresaId={empresa.id}>
                    <button type="button" className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-acento-tinta hover:underline">
                      <Plus className="size-3.5" weight="bold" aria-hidden /> Añadir
                    </button>
                  </NuevoContacto>
                </div>
                {otros.length === 0 ? (
                  <p className="mt-2 text-sm text-tinta-2">Es el único contacto de {empresa.nombre}.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {otros.map((o) => (
                      <li key={o.id} className="flex min-w-0 items-center justify-between gap-2">
                        <span className="flex min-w-0 flex-col">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <EnlaceContacto c={o} />
                            {o.principal && <MarcaPrincipal />}
                          </span>
                          {o.cargo && <span className="truncate pl-7 text-xs text-tinta-2">{o.cargo}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Seccion>
          ) : (
            <Seccion titulo="Empresa" id="empresa">
              <SinDatos
                titulo="Sin empresa"
                texto="Asócialo a una empresa desde «Editar» para verlo en su ficha y en sus oportunidades."
              />
            </Seccion>
          )}
        </div>
      </div>
    </main>
  );
}
