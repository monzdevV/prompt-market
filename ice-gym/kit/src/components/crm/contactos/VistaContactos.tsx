"use client";

import { useCallback, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretDown, CaretUp, EnvelopeSimple, Phone, SquaresFour, Table } from "@phosphor-icons/react";
import { Avatar, EnlaceEmpresa, Responsable } from "@/components/crm/b2b/Piezas";
import { SinDatos } from "@/components/crm/Primitivas";
import { useEscritorio, useTramos } from "@/components/crm/MostrarMas";
import { nombreCompleto, ruta } from "@/lib/b2b";
import { numero } from "@/lib/formato";
import type { Catalogos } from "@/lib/datos/b2b";
import type { ContactoFila } from "@/lib/datos/contactos";
import { MenuContacto, ProveedorAcciones } from "./AccionesContacto";
import { BarraFiltrosContactos } from "./BarraFiltrosContactos";
import { BadgeTipoContacto, EstadoContactoMarca, MarcaPrincipal, UltimaActividad } from "./PiezasContacto";
import { DIR_NATURAL, FILTROS_DEFECTO, hayFiltrosActivos, leerFiltrosContactos, type FiltrosContactos, type OrdenContactos, type VistaContactos as Vista } from "./filtros";
import { NuevoContacto } from "./NuevoContacto";

const PESTANAS: { vista: Vista; texto: string; Icono: typeof Table }[] = [
  { vista: "tabla", texto: "Tabla", Icono: Table },
  { vista: "tarjetas", texto: "Tarjetas", Icono: SquaresFour },
];

export function VistaContactos({
  contactos,
  catalogos,
  paises,
  limitado,
}: {
  contactos: ContactoFila[];
  catalogos: Catalogos;
  paises: string[];
  limitado: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const filtros = leerFiltrosContactos(params);
  const escritorio = useEscritorio();
  const { visibles, mas } = useTramos(contactos, 50);

  const cambiar = useCallback(
    (c: Partial<FiltrosContactos>) => {
      const p = new URLSearchParams(params.toString());
      const siguiente = { ...leerFiltrosContactos(params), ...c };
      if ("orden" in c && c.dir === undefined) siguiente.dir = DIR_NATURAL[siguiente.orden];
      for (const k of Object.keys(FILTROS_DEFECTO) as (keyof FiltrosContactos)[]) {
        const v = siguiente[k];
        const defecto = k === "dir" ? DIR_NATURAL[siguiente.orden] : FILTROS_DEFECTO[k];
        if (!v || v === defecto) p.delete(k);
        else p.set(k, String(v));
      }
      empezar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
    },
    [params, pathname, router]
  );

  const ordenarPor = (orden: OrdenContactos) =>
    cambiar(orden === filtros.orden ? { dir: filtros.dir === "asc" ? "desc" : "asc" } : { orden, dir: undefined });

  return (
    <ProveedorAcciones catalogos={catalogos}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <nav className="-mx-4 flex gap-1 px-4 lg:-mx-8 lg:px-8" aria-label="Vistas">
          {PESTANAS.map(({ vista, texto, Icono }) => {
            const activa = filtros.vista === vista;
            return (
              <button
                key={vista}
                type="button"
                onClick={() => cambiar({ vista })}
                aria-current={activa ? "page" : undefined}
                className={`relative flex h-10 items-center gap-1.5 px-2.5 text-sm font-medium transition-colors ${
                  activa ? "text-tinta" : "text-tinta-2 hover:text-tinta"
                }`}
              >
                <Icono className="size-4" weight={activa ? "fill" : "regular"} aria-hidden />
                {texto}
                {activa && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-acento-tinta" aria-hidden />}
              </button>
            );
          })}
          <span className="ml-auto self-center text-[0.8125rem] tabular-nums text-tinta-2" aria-live="polite">
            {numero(contactos.length)} {contactos.length === 1 ? "contacto" : "contactos"}
            {limitado && " (primeros)"}
          </span>
        </nav>

        <BarraFiltrosContactos filtros={filtros} cambiar={cambiar} catalogos={catalogos} paises={paises} />

        <div className={`min-h-0 flex-1 transition-opacity ${pendiente ? "opacity-60" : ""}`} aria-busy={pendiente}>
          {contactos.length === 0 ? (
            hayFiltrosActivos(filtros) ? (
              <SinDatos
                titulo="Ningún contacto con estos filtros"
                texto="Prueba a quitar algún filtro o a buscar por otro dato (email, cargo o empresa)."
                accion={
                  <button
                    type="button"
                    onClick={() => router.replace(pathname, { scroll: false })}
                    className="text-sm font-medium text-acento-tinta underline-offset-4 hover:underline"
                  >
                    Quitar filtros
                  </button>
                }
              />
            ) : (
              <SinDatos
                titulo="Todavía no hay contactos"
                texto="Añade a las personas con las que tratas en clientes, proveedores y partners. Luego podrás abrirles oportunidades y registrar llamadas, emails y reuniones."
                accion={<NuevoContacto catalogos={catalogos} />}
              />
            )
          ) : filtros.vista === "tarjetas" || !escritorio ? (
            <div className="flex flex-col">
              <Tarjetas filas={visibles} />
              {mas}
            </div>
          ) : (
            <Tabla filas={visibles} filtros={filtros} ordenarPor={ordenarPor} mas={mas} />
          )}
        </div>
      </div>
    </ProveedorAcciones>
  );
}

/* --------------------------------- Tabla --------------------------------- */

function Cabecera({
  texto,
  orden,
  filtros,
  ordenarPor,
  className = "",
}: {
  texto: string;
  orden?: OrdenContactos;
  filtros: FiltrosContactos;
  ordenarPor: (o: OrdenContactos) => void;
  className?: string;
}) {
  if (!orden) return <th className={`py-2.5 pr-4 font-normal ${className}`}>{texto}</th>;
  const activa = filtros.orden === orden;
  const Flecha = filtros.dir === "asc" ? CaretUp : CaretDown;
  return (
    <th
      className={`py-2.5 pr-4 font-normal ${className}`}
      aria-sort={activa ? (filtros.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => ordenarPor(orden)}
        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento ${
          activa ? "font-medium text-tinta" : ""
        }`}
      >
        {texto}
        {activa && <Flecha className="size-3" weight="bold" aria-hidden />}
      </button>
    </th>
  );
}

function Tabla({
  filas,
  filtros,
  ordenarPor,
  mas,
}: {
  filas: ContactoFila[];
  filtros: FiltrosContactos;
  ordenarPor: (o: OrdenContactos) => void;
  mas: React.ReactNode;
}) {
  const cab = { filtros, ordenarPor };
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-placa shadow-placa md:h-full">
      <div className="relative min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-placa">
            <tr className="border-b border-linea text-[0.8125rem] text-tinta-2">
              <Cabecera texto="Contacto" orden="nombre" {...cab} className="pl-4" />
              <Cabecera texto="Empresa" orden="empresa" {...cab} />
              <Cabecera texto="Email y teléfono" {...cab} />
              <Cabecera texto="Tipo" {...cab} />
              <Cabecera texto="Estado" {...cab} />
              <Cabecera texto="Responsable" {...cab} />
              <Cabecera texto="Oport." orden="oportunidades" {...cab} className="text-right" />
              <Cabecera texto="Última actividad" orden="actividad" {...cab} />
              <th className="w-12 py-2.5 pr-3 font-normal">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => (
              <tr key={c.id} className="group border-b border-linea/70 transition-colors last:border-0 hover:bg-placa-2/60">
                <td className="max-w-[260px] py-2.5 pl-4 pr-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar nombre={c.nombre} apellidos={c.apellidos} url={c.avatar_url} tamano="md" />
                    <div className="min-w-0">
                      <Link
                        href={ruta.contacto(c.id)}
                        className="flex min-w-0 items-center gap-1.5 font-medium text-tinta outline-none hover:text-acento-tinta focus-visible:underline"
                      >
                        <span className="truncate">{nombreCompleto(c)}</span>
                        {c.principal && <MarcaPrincipal />}
                      </Link>
                      <span className="block truncate text-[0.8125rem] text-tinta-2">{c.cargo ?? "Sin cargo"}</span>
                    </div>
                  </div>
                </td>
                <td className="max-w-[200px] py-2.5 pr-4">
                  <EnlaceEmpresa e={c.empresa} />
                </td>
                <td className="max-w-[230px] py-2.5 pr-4 text-sm">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="block truncate text-tinta hover:underline">
                      {c.email}
                    </a>
                  ) : (
                    <span className="block text-tinta-2">Sin email</span>
                  )}
                  {c.telefono && (
                    <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="block truncate tabular-nums text-tinta-2 hover:text-tinta hover:underline">
                      {c.telefono}
                    </a>
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  <BadgeTipoContacto tipo={c.tipo} />
                </td>
                <td className="py-2.5 pr-4">
                  <EstadoContactoMarca estado={c.estado} />
                </td>
                <td className="max-w-[140px] py-2.5 pr-4">
                  <Responsable m={c.responsable} />
                </td>
                <td className="py-2.5 pr-4 text-right text-sm font-medium tabular-nums text-tinta">
                  {c.n_oportunidades > 0 ? c.n_oportunidades : <span className="text-tinta-2">0</span>}
                </td>
                <td className="py-2.5 pr-4">
                  <UltimaActividad u={c.ultima_actividad} />
                </td>
                <td className="py-2.5 pr-3">
                  <MenuContacto c={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mas && <div className="flex pb-3">{mas}</div>}
      </div>
    </div>
  );
}

/* -------------------------------- Tarjetas -------------------------------- */

function Tarjetas({ filas }: { filas: ContactoFila[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {filas.map((c) => (
        <li key={c.id} className="relative flex flex-col gap-3 rounded-2xl bg-placa p-4 shadow-placa transition-colors hover:bg-placa-2/40">
          <div className="flex items-start gap-3">
            <Avatar nombre={c.nombre} apellidos={c.apellidos} url={c.avatar_url} tamano="md" />
            <div className="min-w-0 flex-1">
              <Link href={ruta.contacto(c.id)} className="flex min-w-0 items-center gap-1.5 font-medium text-tinta hover:text-acento-tinta">
                <span className="truncate">{nombreCompleto(c)}</span>
                {c.principal && <MarcaPrincipal />}
              </Link>
              <p className="truncate text-[0.8125rem] text-tinta-2">{c.cargo ?? "Sin cargo"}</p>
            </div>
            <MenuContacto c={c} className="-mr-2 -mt-1.5" />
          </div>

          <div className="min-w-0">
            <EnlaceEmpresa e={c.empresa} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <BadgeTipoContacto tipo={c.tipo} />
            <EstadoContactoMarca estado={c.estado} />
          </div>

          <div className="flex items-center gap-1.5">
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                title={c.email}
                className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md bg-placa-2 px-2 text-xs text-tinta transition-colors hover:bg-linea"
              >
                <EnvelopeSimple className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{c.email}</span>
              </a>
            )}
            {c.telefono && (
              <a
                href={`tel:${c.telefono.replace(/\s/g, "")}`}
                aria-label={`Llamar a ${c.telefono}`}
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-placa-2 px-2 text-xs tabular-nums text-tinta transition-colors hover:bg-linea"
              >
                <Phone className="size-3.5" aria-hidden />
                {c.telefono}
              </a>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <UltimaActividad u={c.ultima_actividad} />
            <div className="flex items-center gap-3">
              <span className="text-xs text-tinta-2">
                <span className="font-semibold tabular-nums text-tinta">{c.n_oportunidades}</span> oport.
              </span>
              <Responsable m={c.responsable} soloAvatar />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
