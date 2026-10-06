import Link from "next/link";
import { MARCA } from "@/marca";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  EnvelopeSimple,
  Globe,
  Handshake,
  NotePencil,
  Phone,
  Plus,
  Star,
  UserPlus,
} from "@phosphor-icons/react/dist/ssr";
import {
  ETAPAS,
  ETIQUETA_ETAPA,
  ETIQUETA_TIPO_CONTACTO,
  TONO_ETAPA,
  accionVencidaB2B,
  esEtapaAbierta,
  etiquetaSector,
  nombreCompleto,
  ruta,
  type Empresa,
  type InteraccionCompleta,
} from "@/lib/b2b";
import { catalogos as leerCatalogos } from "@/lib/datos/b2b";
import { obtenerEmpresa, type EmpresaFicha } from "@/lib/datos/empresas";
import { listarInteracciones } from "@/lib/datos/interacciones";
import { dinero, fecha, fechaHora, numero, relativo } from "@/lib/formato";
import { Seccion, SinDatos, claseBotonPrincipal } from "@/components/crm/Primitivas";
import {
  Avatar,
  BadgeEstadoEmpresa,
  BadgeEtapa,
  BadgeInteraccion,
  BadgeTipoEmpresa,
  BadgeTipoOportunidad,
  Dato,
  LogoEmpresa,
  Responsable,
  Tag,
} from "@/components/crm/b2b/Piezas";
import { NuevaOportunidad } from "@/components/crm/oportunidades/NuevaOportunidad";
import { NuevoContacto } from "@/components/crm/contactos/NuevoContacto";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";
import { LineaTemporal } from "@/components/crm/actividad/LineaTemporal";
import {
  BorrarEmpresa,
  BotonPrincipal,
  EditarEmpresa,
  NotaRapida,
  NotasEmpresa,
  PestanasEmpresa,
  claseBotonSecundario,
} from "@/components/crm/empresas/ControlesEmpresa";
import { urlWeb, webLimpia } from "@/components/crm/empresas/CamposEmpresa";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const empresa = await obtenerEmpresa(id);
  return { title: empresa?.nombre ?? "Empresa" };
}

/** Momento de la petición (la página es dinámica). */
const instante = () => Date.now();

/** Sólo las columnas de la tabla: al formulario de edición no le hacen falta las relaciones. */
function soloEmpresa(e: EmpresaFicha): Empresa {
  const copia: Partial<EmpresaFicha> = { ...e };
  delete copia.contactos;
  delete copia.oportunidades;
  delete copia.responsable;
  return copia as Empresa;
}

const diaMes = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: MARCA.zonaHoraria });
const fechaCorta = (iso: string) => diaMes.format(new Date(iso)).replace(".", "");

export default async function PaginaEmpresa({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const [empresa, catalogos, interacciones] = await Promise.all([
    obtenerEmpresa(id),
    leerCatalogos(),
    listarInteracciones({ empresaId: id }),
  ]);
  if (!empresa) notFound();

  const ahora = instante();
  const ops = empresa.oportunidades;
  const abiertas = ops.filter((o) => esEtapaAbierta(o.etapa));
  const valorAbierto = abiertas.reduce((s, o) => s + Number(o.valor), 0);
  const ganadas = ops.filter((o) => o.etapa === "ganada");
  const valorGanado = ganadas.reduce((s, o) => s + Number(o.valor), 0);

  const pasadas = interacciones.filter((i) => new Date(i.fecha).getTime() <= ahora);
  const ultimaActividad = [pasadas[0]?.fecha, ...ops.map((o) => o.updated_at)]
    .filter((f): f is string => !!f)
    .sort()
    .at(-1);

  // Última actividad por oportunidad, a partir del historial de la empresa.
  const ultimaPorOp = new Map<string, string>();
  for (const i of pasadas) if (i.oportunidad_id && !ultimaPorOp.has(i.oportunidad_id)) ultimaPorOp.set(i.oportunidad_id, i.fecha);

  const pendientes = interacciones
    .filter((i) => i.estado === "pendiente")
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 5);
  const notas = interacciones.filter((i) => i.tipo === "nota");
  const datosEmpresa = soloEmpresa(empresa);
  const principal = empresa.contactos.find((c) => c.principal) ?? null;
  const telefono = empresa.telefono?.replace(/\s/g, "");

  const kpis = [
    { k: "Pipeline abierto", v: dinero(valorAbierto), d: `${abiertas.length} abierta${abiertas.length === 1 ? "" : "s"}` },
    { k: "Ganado", v: dinero(valorGanado), d: `${ganadas.length} ganada${ganadas.length === 1 ? "" : "s"}` },
    { k: "Oportunidades", v: numero(ops.length), d: `${ops.filter((o) => o.etapa === "perdida").length} perdidas` },
    { k: "Contactos", v: numero(empresa.contactos.length), d: principal ? `Principal: ${principal.nombre}` : "Sin principal" },
    { k: "Última actividad", v: ultimaActividad ? relativo(ultimaActividad) : "Nunca", d: ultimaActividad ? fecha(ultimaActividad) : "Registra la primera" },
  ];

  /* ------------------------------ Pestañas ------------------------------ */

  const general = (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Seccion titulo="Datos de la empresa">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          <Dato etiqueta="Nombre">{empresa.nombre}</Dato>
          <Dato etiqueta="Logo">
            <LogoEmpresa nombre={empresa.nombre} url={empresa.logo_url} tamano="md" />
          </Dato>
          <Dato etiqueta="Sector">{etiquetaSector(empresa.sector)}</Dato>
          <Dato etiqueta="Tipo">
            <BadgeTipoEmpresa tipo={empresa.tipo} />
          </Dato>
          <Dato etiqueta="Estado">
            <BadgeEstadoEmpresa estado={empresa.estado} />
          </Dato>
          <Dato etiqueta="CIF / NIF">{empresa.cif}</Dato>
          <Dato etiqueta="Web">
            {empresa.web && (
              <a href={urlWeb(empresa.web)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                {webLimpia(empresa.web)} <ArrowSquareOut className="size-3.5 text-tinta-2" aria-hidden />
              </a>
            )}
          </Dato>
          <Dato etiqueta="Teléfono">{empresa.telefono && <a href={`tel:${telefono}`} className="tabular-nums hover:underline">{empresa.telefono}</a>}</Dato>
          <Dato etiqueta="Email">{empresa.email && <a href={`mailto:${empresa.email}`} className="break-all hover:underline">{empresa.email}</a>}</Dato>
          <Dato etiqueta="Dirección">{empresa.direccion}</Dato>
          <Dato etiqueta="Ciudad">{empresa.ciudad}</Dato>
          <Dato etiqueta="País">{empresa.pais}</Dato>
          <Dato etiqueta="Responsable interno">
            <Responsable m={empresa.responsable} />
          </Dato>
          <Dato etiqueta="Alta">{`${fecha(empresa.created_at)} (${relativo(empresa.created_at)})`}</Dato>
          <Dato etiqueta="Última modificación">{fecha(empresa.updated_at)}</Dato>
        </dl>
        <div className="mt-6">
          <Dato etiqueta="Descripción">
            {empresa.descripcion && <p className="whitespace-pre-line leading-relaxed">{empresa.descripcion}</p>}
          </Dato>
        </div>
      </Seccion>

      <div className="flex flex-col gap-5">
        <Seccion titulo="Contacto principal">
          {principal ? (
            <Link href={ruta.contacto(principal.id)} className="flex items-center gap-3 rounded-lg hover:bg-placa-2/60">
              <Avatar nombre={principal.nombre} apellidos={principal.apellidos} url={principal.avatar_url} tamano="md" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-tinta">{nombreCompleto(principal)}</span>
                <span className="block truncate text-[0.8125rem] text-tinta-2">{principal.cargo ?? ETIQUETA_TIPO_CONTACTO[principal.tipo]}</span>
                {principal.email && <span className="block truncate text-[0.8125rem] text-tinta-2">{principal.email}</span>}
              </span>
            </Link>
          ) : (
            <p className="text-sm text-tinta-2">
              {empresa.contactos.length ? "Marca un contacto como principal en la pestaña Contactos." : "Aún no hay contactos en esta empresa."}
            </p>
          )}
        </Seccion>
        <Seccion titulo="Próximas tareas" extra={<span className="text-xs tabular-nums text-tinta-2">{pendientes.length}</span>}>
          {pendientes.length === 0 ? (
            <p className="text-sm text-tinta-2">Nada pendiente con esta empresa.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {pendientes.map((i) => (
                <TareaMini key={i.id} i={i} ahora={ahora} />
              ))}
            </ul>
          )}
        </Seccion>
      </div>
    </div>
  );

  const contactos =
    empresa.contactos.length === 0 ? (
      <SinDatos
        titulo="Sin contactos"
        texto="Añade a las personas con las que tratáis en esta empresa: decisor, compras, técnico…"
        accion={
          <NuevoContacto catalogos={catalogos} empresaId={empresa.id}>
            <button type="button" className={`${claseBotonPrincipal} mt-2 h-8 px-3`}>
              <UserPlus className="size-4" aria-hidden /> Nuevo contacto
            </button>
          </NuevoContacto>
        }
      />
    ) : (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <NuevoContacto catalogos={catalogos} empresaId={empresa.id}>
            <button type="button" className={claseBotonSecundario}>
              <Plus className="size-4" aria-hidden /> Añadir contacto
            </button>
          </NuevoContacto>
        </div>
        <div className="hidden overflow-x-auto rounded-2xl bg-placa shadow-placa md:block">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-[0.8125rem] text-tinta-2">
                <th className="py-2.5 pl-4 pr-4 font-normal">Contacto</th>
                <th className="py-2.5 pr-4 font-normal">Cargo</th>
                <th className="py-2.5 pr-4 font-normal">Email</th>
                <th className="py-2.5 pr-4 font-normal">Teléfono</th>
                <th className="py-2.5 pr-4 font-normal">Rol</th>
                <th className="py-2.5 pr-4 font-normal">Relación</th>
              </tr>
            </thead>
            <tbody>
              {empresa.contactos.map((c) => (
                <tr key={c.id} className="border-b border-linea/70 last:border-0 hover:bg-placa-2/60">
                  <td className="py-2.5 pl-4 pr-4">
                    <Link href={ruta.contacto(c.id)} className="flex min-w-0 items-center gap-2.5 hover:underline">
                      <Avatar nombre={c.nombre} apellidos={c.apellidos} url={c.avatar_url} />
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-tinta">{c.nombre}</span> <span className="text-tinta">{c.apellidos}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="max-w-[180px] truncate py-2.5 pr-4 text-tinta-2">{c.cargo ?? "—"}</td>
                  <td className="max-w-[220px] truncate py-2.5 pr-4">
                    {c.email ? <a href={`mailto:${c.email}`} className="text-tinta hover:underline">{c.email}</a> : <span className="text-tinta-2">—</span>}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums">
                    {c.telefono ? <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="text-tinta hover:underline">{c.telefono}</a> : <span className="text-tinta-2">—</span>}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Tag tono="var(--relleno-gris)">{ETIQUETA_TIPO_CONTACTO[c.tipo]}</Tag>
                    {c.rol && <span className="ml-1.5 text-xs text-tinta-2">{c.rol}</span>}
                  </td>
                  <td className="py-2.5 pr-4">
                    {c.principal ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-acento-tinta">
                        <Star className="size-3.5" weight="fill" aria-hidden /> Principal
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-tinta-2">Secundario</span>
                        <BotonPrincipal empresaId={empresa.id} contactoId={c.id} nombre={c.nombre} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="grid gap-2 md:hidden">
          {empresa.contactos.map((c) => (
            <li key={c.id} className="rounded-2xl bg-placa p-3.5 shadow-placa">
              <Link href={ruta.contacto(c.id)} className="flex items-center gap-3">
                <Avatar nombre={c.nombre} apellidos={c.apellidos} url={c.avatar_url} tamano="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-tinta">{nombreCompleto(c)}</span>
                  <span className="block truncate text-[0.8125rem] text-tinta-2">{c.cargo ?? ETIQUETA_TIPO_CONTACTO[c.tipo]}</span>
                </span>
                {c.principal && <Star className="size-4 text-acento-tinta" weight="fill" aria-label="Principal" />}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.8125rem]">
                {c.email && <a href={`mailto:${c.email}`} className="truncate text-tinta-2 hover:underline">{c.email}</a>}
                {c.telefono && <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="tabular-nums text-tinta-2 hover:underline">{c.telefono}</a>}
                {!c.principal && <BotonPrincipal empresaId={empresa.id} contactoId={c.id} nombre={c.nombre} />}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );

  const porEtapa = ETAPAS.map((e) => {
    const de = ops.filter((o) => o.etapa === e);
    return { e, n: de.length, valor: de.reduce((s, o) => s + Number(o.valor), 0) };
  });

  const oportunidades =
    ops.length === 0 ? (
      <SinDatos
        titulo="Sin oportunidades"
        texto="Registra una venta, una compra a proveedor o una colaboración con esta empresa para seguirla en el pipeline."
        accion={
          <NuevaOportunidad catalogos={catalogos} empresaId={empresa.id}>
            <button type="button" className={`${claseBotonPrincipal} mt-2 h-8 px-3`}>
              <Handshake className="size-4" aria-hidden /> Nueva oportunidad
            </button>
          </NuevaOportunidad>
        }
      />
    ) : (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-stretch justify-between gap-3">
          <ol className="grid flex-1 grid-cols-3 gap-1 rounded-2xl bg-placa p-1.5 shadow-placa sm:grid-cols-6" aria-label="Resumen por etapa">
            {porEtapa.map(({ e, n, valor }) => (
              <li key={e} className={`flex flex-col gap-1 rounded-xl px-3 py-2.5 ${n === 0 ? "opacity-55" : ""}`}>
                <span className="flex items-center gap-1.5 text-xs text-tinta-2">
                  <span className="size-2 rounded-full" style={{ background: TONO_ETAPA[e] }} aria-hidden />
                  {ETIQUETA_ETAPA[e]}
                </span>
                <span className="cifra text-2xl text-tinta">{n}</span>
                <span className="text-xs tabular-nums text-tinta-2">{dinero(valor)}</span>
              </li>
            ))}
          </ol>
          <NuevaOportunidad catalogos={catalogos} empresaId={empresa.id}>
            <button type="button" className={`${claseBotonSecundario} self-start`}>
              <Plus className="size-4" aria-hidden /> Nueva oportunidad
            </button>
          </NuevaOportunidad>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-placa shadow-placa">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-[0.8125rem] text-tinta-2">
                <th className="py-2.5 pl-4 pr-4 font-normal">Oportunidad</th>
                <th className="py-2.5 pr-4 font-normal">Tipo</th>
                <th className="py-2.5 pr-4 font-normal">Etapa</th>
                <th className="py-2.5 pr-4 text-right font-normal">Valor</th>
                <th className="py-2.5 pr-4 font-normal">Responsable</th>
                <th className="py-2.5 pr-4 font-normal">Última actividad</th>
                <th className="py-2.5 pr-4 font-normal">Próxima acción</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((o) => {
                const vencida = accionVencidaB2B(o, ahora);
                const ultima = ultimaPorOp.get(o.id) ?? o.updated_at;
                return (
                  <tr key={o.id} className="border-b border-linea/70 last:border-0 hover:bg-placa-2/60">
                    <td className="max-w-[260px] py-2.5 pl-4 pr-4">
                      <Link href={ruta.oportunidad(o.id)} className="block truncate font-medium text-tinta hover:text-acento-tinta hover:underline">
                        {o.nombre}
                      </Link>
                      {o.contacto && <span className="block truncate text-xs text-tinta-2">{nombreCompleto(o.contacto)}</span>}
                    </td>
                    <td className="py-2.5 pr-4">
                      <BadgeTipoOportunidad tipo={o.tipo} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <BadgeEtapa etapa={o.etapa} />
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-tinta">{dinero(o.valor)}</td>
                    <td className="py-2.5 pr-4">
                      <Responsable m={o.responsable} />
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-tinta-2">{relativo(ultima)}</td>
                    <td className="max-w-[220px] py-2.5 pr-4">
                      {o.proxima_accion || o.proxima_accion_fecha ? (
                        <span className="flex min-w-0 flex-col leading-tight">
                          <span className="truncate text-tinta">{o.proxima_accion ?? "Seguimiento"}</span>
                          {o.proxima_accion_fecha && (
                            <span className={`text-xs tabular-nums ${vencida ? "font-medium text-critico" : "text-tinta-2"}`}>
                              {vencida ? "Vencida · " : ""}
                              {fechaCorta(o.proxima_accion_fecha)}
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
      </div>
    );

  const actividad = (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NuevaInteraccion catalogos={catalogos} empresaId={empresa.id}>
          <button type="button" className={claseBotonSecundario}>
            <NotePencil className="size-4" aria-hidden /> Registrar actividad
          </button>
        </NuevaInteraccion>
      </div>
      <LineaTemporal items={interacciones} vacio="Sin actividad con esta empresa. Registra una llamada, reunión o email." />
    </div>
  );

  const notasPanel = (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Seccion titulo="Notas generales">
        <NotasEmpresa id={empresa.id} notas={empresa.notas} />
      </Seccion>
      <Seccion titulo="Historial de notas" extra={<span className="text-xs tabular-nums text-tinta-2">{notas.length}</span>}>
        <div className="flex flex-col gap-5">
          <NotaRapida empresaId={empresa.id} />
          <LineaTemporal items={notas} vacio="Todavía no hay notas en el historial." />
        </div>
      </Seccion>
    </div>
  );

  return (
    <main className="px-4 pb-12 pt-5 lg:px-8">
      <Link href={ruta.empresas} className="inline-flex items-center gap-1.5 text-[0.8125rem] text-tinta-2 hover:text-tinta">
        <ArrowLeft className="size-4" aria-hidden />
        Empresas
      </Link>

      {/* Cabecera */}
      <header className="mt-3 flex flex-col gap-4 pb-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <LogoEmpresa nombre={empresa.nombre} url={empresa.logo_url} tamano="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-tinta">{empresa.nombre}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <BadgeTipoEmpresa tipo={empresa.tipo} />
                <BadgeEstadoEmpresa estado={empresa.estado} />
                <Tag tono="var(--relleno-gris)">{etiquetaSector(empresa.sector)}</Tag>
                {(empresa.ciudad || empresa.pais) && (
                  <span className="text-[0.8125rem] text-tinta-2">{[empresa.ciudad, empresa.pais].filter(Boolean).join(", ")}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-tinta-2">
                <span className="flex items-center gap-1.5">
                  Responsable <Responsable m={empresa.responsable} />
                </span>
                {empresa.web && (
                  <a href={urlWeb(empresa.web)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-tinta hover:underline">
                    <Globe className="size-3.5" aria-hidden /> {webLimpia(empresa.web)}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {telefono && (
              <a href={`tel:${telefono}`} className={claseBotonSecundario}>
                <Phone className="size-4" aria-hidden /> Llamar
              </a>
            )}
            {empresa.email && (
              <a href={`mailto:${empresa.email}`} className={claseBotonSecundario}>
                <EnvelopeSimple className="size-4" aria-hidden /> Email
              </a>
            )}
            <EditarEmpresa empresa={datosEmpresa} equipo={catalogos.equipo} />
            <BorrarEmpresa id={empresa.id} nombre={empresa.nombre} nContactos={empresa.contactos.length} nOportunidades={ops.length} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NuevaOportunidad catalogos={catalogos} empresaId={empresa.id}>
            <button type="button" className={`${claseBotonPrincipal} h-8 px-3`}>
              <Handshake className="size-4" aria-hidden /> Nueva oportunidad
            </button>
          </NuevaOportunidad>
          <NuevoContacto catalogos={catalogos} empresaId={empresa.id}>
            <button type="button" className={claseBotonSecundario}>
              <UserPlus className="size-4" aria-hidden /> Nuevo contacto
            </button>
          </NuevoContacto>
          <NuevaInteraccion catalogos={catalogos} empresaId={empresa.id}>
            <button type="button" className={claseBotonSecundario}>
              <NotePencil className="size-4" aria-hidden /> Registrar actividad
            </button>
          </NuevaInteraccion>
        </div>
      </header>

      {/* Cifras clave */}
      <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((c) => (
          <div key={c.k} className="min-w-0 rounded-2xl bg-placa px-4 py-3.5 shadow-placa">
            <dt className="text-[0.8125rem] text-tinta-2">{c.k}</dt>
            <dd className="cifra mt-1.5 truncate text-[1.75rem] text-tinta">{c.v}</dd>
            <dd className="truncate text-xs text-tinta-2">{c.d}</dd>
          </div>
        ))}
      </dl>

      <PestanasEmpresa
        inicial={tab ?? "general"}
        paneles={[
          { id: "general", texto: "General", contenido: general },
          { id: "contactos", texto: "Contactos", n: empresa.contactos.length, contenido: contactos },
          { id: "oportunidades", texto: "Oportunidades", n: ops.length, contenido: oportunidades },
          { id: "actividad", texto: "Actividad", n: interacciones.length, contenido: actividad },
          { id: "notas", texto: "Notas", n: notas.length, contenido: notasPanel },
        ]}
      />
    </main>
  );
}

function TareaMini({ i, ahora }: { i: InteraccionCompleta; ahora: number }) {
  const vencida = new Date(i.fecha).getTime() < ahora;
  return (
    <li className="flex items-start gap-2.5">
      <BadgeInteraccion tipo={i.tipo} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-tinta">{i.titulo}</span>
        <span className={`block text-xs tabular-nums ${vencida ? "font-medium text-critico" : "text-tinta-2"}`}>
          {vencida ? "Vencida · " : ""}
          {fechaHora(i.fecha)}
          {i.oportunidad && ` · ${i.oportunidad.nombre}`}
        </span>
      </span>
    </li>
  );
}
