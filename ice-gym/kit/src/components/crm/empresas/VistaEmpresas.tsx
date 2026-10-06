"use client";

import { useCallback, useEffect, useState, useTransition, type MouseEvent } from "react";
import { useEscritorio, useTramos } from "@/components/crm/MostrarMas";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Buildings,
  CaretDown,
  EnvelopeSimple,
  Globe,
  MagnifyingGlass,
  MapPin,
  Phone,
  Rows,
  SquaresFour,
  X,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ESTADOS_EMPRESA,
  ETIQUETA_ESTADO_EMPRESA,
  ETIQUETA_TIPO_EMPRESA,
  TIPOS_EMPRESA,
  TONO_TIPO_EMPRESA,
  etiquetaSector,
  nombreCompleto,
  ruta,
  type TipoEmpresa,
} from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import type { EmpresaConResumen } from "@/lib/datos/empresas";
import { dinero, numero, relativo } from "@/lib/formato";
import { SinDatos } from "@/components/crm/Primitivas";
import { BadgeEstadoEmpresa, BadgeTipoEmpresa, LogoEmpresa, Responsable } from "@/components/crm/b2b/Piezas";
import {
  DIR_NATURAL,
  FILTROS_DEFECTO,
  ORDENES_EMPRESA,
  RANGOS_OPORTUNIDADES,
  type FiltrosEmpresas,
  type OrdenEmpresa,
} from "./filtros";
import { MenuEmpresa, useLanzador, type AccionRapida } from "./MenuEmpresa";
import { NuevaEmpresa } from "./NuevaEmpresa";
import { urlWeb, webLimpia } from "./CamposEmpresa";

/* ------------------------------- Piezas ------------------------------- */

function Pildora<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  etiqueta: string;
  valor: T;
  opciones: { valor: T; texto: string }[];
  onCambio: (v: T) => void;
}) {
  const actual = opciones.find((o) => o.valor === valor)?.texto ?? valor;
  const activa = opciones[0]?.valor !== valor;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex h-8 items-stretch overflow-hidden rounded-lg text-[0.8125rem] shadow-placa transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta ${
            activa ? "bg-acento-suave" : "bg-placa hover:bg-placa-2"
          }`}
        >
          <span className="flex items-center pl-2.5 text-tinta-2">{etiqueta}</span>
          <span className="flex max-w-40 items-center gap-1.5 px-2.5 font-medium text-tinta">
            <span className="truncate">{actual}</span>
            <CaretDown className="size-3 shrink-0 text-tinta-2" weight="bold" aria-hidden />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 min-w-48 overflow-y-auto">
        <DropdownMenuRadioGroup value={valor} onValueChange={(v) => onCambio(v as T)}>
          {opciones.map((o) => (
            <DropdownMenuRadioItem key={o.valor} value={o.valor}>
              {o.texto}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChipsTipo({
  actual,
  conteo,
  total,
  onCambio,
}: {
  actual: "todos" | TipoEmpresa;
  conteo: Record<TipoEmpresa, number>;
  total: number;
  onCambio: (t: "todos" | TipoEmpresa) => void;
}) {
  const chips: { valor: "todos" | TipoEmpresa; texto: string; n: number; tono?: string }[] = [
    { valor: "todos", texto: "Todas", n: total },
    ...TIPOS_EMPRESA.map((t) => ({ valor: t, texto: ETIQUETA_TIPO_EMPRESA[t], n: conteo[t], tono: TONO_TIPO_EMPRESA[t] })),
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Tipo de empresa"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0"
    >
      {chips.map((c) => {
        const activo = actual === c.valor;
        return (
          <button
            key={c.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(c.valor)}
            className={`flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[0.8125rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta ${
              activo
                ? "bg-acento-suave text-acento-tinta"
                : "bg-placa text-tinta shadow-placa hover:bg-placa-2"
            } ${c.n === 0 && !activo ? "opacity-60" : ""}`}
          >
            {c.tono && <span className="size-2 rounded-full" style={{ background: c.tono }} aria-hidden />}
            {c.texto}
            <span className={`tabular-nums ${activo ? "opacity-70" : "text-tinta-2"}`}>{numero(c.n)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Valor({ e }: { e: EmpresaConResumen }) {
  if (e.n_oportunidades === 0) return <span className="text-tinta-2">—</span>;
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="font-medium tabular-nums text-tinta">{dinero(e.valor_total)}</span>
      <span className="text-xs tabular-nums text-tinta-2">{dinero(e.valor_abierto)} abierto</span>
    </span>
  );
}

function Ubicacion({ e }: { e: EmpresaConResumen }) {
  if (!e.ciudad && !e.pais) return <span className="text-tinta-2">—</span>;
  return (
    <span className="flex flex-col leading-tight">
      <span className="truncate text-tinta">{e.ciudad ?? "—"}</span>
      <span className="truncate text-xs text-tinta-2">{e.pais}</span>
    </span>
  );
}

/** Evita navegar a la ficha cuando el clic es sobre un control de la fila. */
const esControl = (ev: MouseEvent) =>
  (ev.target as HTMLElement).closest("a, button, input, [role=menu], [role=menuitem]") !== null;

/* ------------------------------- Tabla ------------------------------- */

const COLUMNAS_ORDENABLES: Partial<Record<string, OrdenEmpresa>> = {
  Empresa: "nombre",
  Oport: "oportunidades",
  Valor: "valor",
  Actividad: "actividad",
};

function Cabecera({
  texto,
  clave,
  filtros,
  ordenar,
  className = "",
}: {
  texto: string;
  clave?: OrdenEmpresa;
  filtros: FiltrosEmpresas;
  ordenar: (o: OrdenEmpresa) => void;
  className?: string;
}) {
  if (!clave) return <th className={`py-2.5 pr-4 font-normal ${className}`}>{texto}</th>;
  const activa = filtros.orden === clave;
  const Flecha = filtros.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={`py-2.5 pr-4 font-normal ${className}`}
      aria-sort={activa ? (filtros.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => ordenar(clave)}
        className={`inline-flex items-center gap-1 rounded hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento ${
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
  ordenar,
  lanzar,
}: {
  filas: EmpresaConResumen[];
  filtros: FiltrosEmpresas;
  ordenar: (o: OrdenEmpresa) => void;
  lanzar: (a: AccionRapida, id: string) => void;
}) {
  const router = useRouter();
  const props = { filtros, ordenar };
  return (
    <div className="overflow-hidden rounded-2xl bg-placa shadow-placa">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
          <thead className="bg-placa">
            <tr className="text-[0.8125rem] text-tinta-2">
              <Cabecera texto="Empresa" clave={COLUMNAS_ORDENABLES.Empresa} {...props} className="pl-4" />
              <Cabecera texto="Tipo" {...props} />
              <Cabecera texto="Sector" {...props} />
              <Cabecera texto="Contacto" {...props} />
              <Cabecera texto="Ubicación" {...props} />
              <Cabecera texto="Responsable" {...props} />
              <Cabecera texto="Estado" {...props} />
              <Cabecera texto="Contactos" {...props} className="text-right" />
              <Cabecera texto="Oport." clave={COLUMNAS_ORDENABLES.Oport} {...props} className="text-right" />
              <Cabecera texto="Valor" clave={COLUMNAS_ORDENABLES.Valor} {...props} className="text-right" />
              <Cabecera texto="Última actividad" clave={COLUMNAS_ORDENABLES.Actividad} {...props} />
              <th className="w-12 py-2.5 pr-3 font-normal">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => (
              <tr
                key={e.id}
                onClick={(ev) => !esControl(ev) && router.push(ruta.empresa(e.id))}
                className="group cursor-pointer border-b border-linea/70 transition-colors last:border-0 hover:bg-placa-2/60"
              >
                <td className="max-w-[260px] py-2.5 pl-4 pr-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="md" />
                    <div className="min-w-0">
                      <Link
                        href={ruta.empresa(e.id)}
                        className="block truncate font-medium text-tinta outline-none group-hover:text-acento-tinta focus-visible:underline"
                      >
                        {e.nombre}
                      </Link>
                      {e.web ? (
                        <a
                          href={urlWeb(e.web)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-[0.8125rem] text-tinta-2 hover:text-tinta hover:underline"
                        >
                          {webLimpia(e.web)}
                        </a>
                      ) : (
                        <span className="block text-[0.8125rem] text-tinta-2">Sin web</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-4">
                  <BadgeTipoEmpresa tipo={e.tipo} />
                </td>
                <td className="max-w-[150px] truncate py-2.5 pr-4 text-tinta-2">{etiquetaSector(e.sector)}</td>
                <td className="max-w-[210px] py-2.5 pr-4">
                  <span className="flex min-w-0 flex-col leading-tight">
                    {e.email ? (
                      <a href={`mailto:${e.email}`} className="truncate text-tinta hover:underline">
                        {e.email}
                      </a>
                    ) : (
                      <span className="text-tinta-2">—</span>
                    )}
                    {e.telefono && (
                      <a href={`tel:${e.telefono.replace(/\s/g, "")}`} className="truncate text-xs tabular-nums text-tinta-2 hover:underline">
                        {e.telefono}
                      </a>
                    )}
                  </span>
                </td>
                <td className="max-w-[140px] py-2.5 pr-4">
                  <Ubicacion e={e} />
                </td>
                <td className="max-w-[140px] py-2.5 pr-4">
                  <Responsable m={e.responsable} />
                </td>
                <td className="py-2.5 pr-4">
                  <BadgeEstadoEmpresa estado={e.estado} />
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-tinta">{e.n_contactos || <span className="text-tinta-2">0</span>}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">
                  <span className="text-tinta">{e.n_oportunidades}</span>
                  {e.n_abiertas > 0 && <span className="text-xs text-tinta-2"> · {e.n_abiertas} ab.</span>}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <Valor e={e} />
                </td>
                <td className="whitespace-nowrap py-2.5 pr-4 text-tinta-2">
                  {e.ultima_actividad ? relativo(e.ultima_actividad) : "Sin actividad"}
                </td>
                <td className="py-2.5 pr-3">
                  <MenuEmpresa empresa={e} lanzar={lanzar} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pie filas={filas} />
    </div>
  );
}

/* ------------------------------ Tarjetas ------------------------------ */

function Tarjeta({ e, lanzar }: { e: EmpresaConResumen; lanzar: (a: AccionRapida, id: string) => void }) {
  const router = useRouter();
  return (
    <li
      onClick={(ev) => !esControl(ev) && router.push(ruta.empresa(e.id))}
      className="group flex cursor-pointer flex-col gap-3 rounded-2xl bg-placa p-4 shadow-placa transition-[background-color,transform] duration-150 hover:bg-placa-2/40 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="md" />
        <div className="min-w-0 flex-1">
          <Link href={ruta.empresa(e.id)} className="block truncate font-medium text-tinta group-hover:text-acento-tinta">
            {e.nombre}
          </Link>
          <p className="truncate text-[0.8125rem] text-tinta-2">{etiquetaSector(e.sector)}</p>
        </div>
        <MenuEmpresa empresa={e} lanzar={lanzar} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <BadgeTipoEmpresa tipo={e.tipo} />
        <BadgeEstadoEmpresa estado={e.estado} />
      </div>
      <ul className="flex flex-col gap-1 text-[0.8125rem] text-tinta-2">
        {e.web && (
          <li className="flex min-w-0 items-center gap-1.5">
            <Globe className="size-3.5 shrink-0" aria-hidden />
            <a href={urlWeb(e.web)} target="_blank" rel="noopener noreferrer" className="truncate hover:text-tinta hover:underline">
              {webLimpia(e.web)}
            </a>
          </li>
        )}
        {e.email && (
          <li className="flex min-w-0 items-center gap-1.5">
            <EnvelopeSimple className="size-3.5 shrink-0" aria-hidden />
            <a href={`mailto:${e.email}`} className="truncate hover:text-tinta hover:underline">
              {e.email}
            </a>
          </li>
        )}
        {e.telefono && (
          <li className="flex min-w-0 items-center gap-1.5">
            <Phone className="size-3.5 shrink-0" aria-hidden />
            <a href={`tel:${e.telefono.replace(/\s/g, "")}`} className="truncate tabular-nums hover:text-tinta hover:underline">
              {e.telefono}
            </a>
          </li>
        )}
        {(e.ciudad || e.pais) && (
          <li className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{[e.ciudad, e.pais].filter(Boolean).join(", ")}</span>
          </li>
        )}
      </ul>
      <dl className="mt-auto grid grid-cols-3 gap-2 rounded-xl bg-placa-2/60 px-2 py-2.5 text-center">
        <div>
          <dt className="text-xs text-tinta-2">Contactos</dt>
          <dd className="font-semibold tabular-nums text-tinta">{e.n_contactos}</dd>
        </div>
        <div>
          <dt className="text-xs text-tinta-2">Oport.</dt>
          <dd className="font-semibold tabular-nums text-tinta">{e.n_oportunidades}</dd>
        </div>
        <div>
          <dt className="text-xs text-tinta-2">Abierto</dt>
          <dd className="truncate font-semibold tabular-nums text-tinta">{dinero(e.valor_abierto)}</dd>
        </div>
      </dl>
      <div className="flex items-center justify-between gap-2 text-xs text-tinta-2">
        <Responsable m={e.responsable} />
        <span>{e.ultima_actividad ? relativo(e.ultima_actividad) : "Sin actividad"}</span>
      </div>
    </li>
  );
}

function Pie({ filas }: { filas: EmpresaConResumen[] }) {
  const suma = filas.reduce(
    (a, e) => ({
      ops: a.ops + e.n_oportunidades,
      total: a.total + e.valor_total,
      abierto: a.abierto + e.valor_abierto,
    }),
    { ops: 0, total: 0, abierto: 0 }
  );
  const celdas = [
    { k: "Empresas en vista", v: numero(filas.length) },
    { k: "Oportunidades", v: numero(suma.ops) },
    { k: "Valor total", v: dinero(suma.total) },
    { k: "Pipeline abierto", v: dinero(suma.abierto) },
  ];
  return (
    <dl className="grid grid-cols-2 bg-placa-2/50 text-sm sm:grid-cols-4">
      {celdas.map((c) => (
        <div key={c.k} className="flex items-baseline gap-2 px-4 py-2.5">
          <dt className="order-2 text-tinta-2">{c.k}</dt>
          <dd className="order-1 font-semibold tabular-nums text-tinta">{c.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------- Vista ------------------------------- */

export function VistaEmpresas({
  filas,
  filtros,
  conteoTipos,
  totalSinTipo,
  catalogos,
  sectores,
  hayEmpresas,
}: {
  filas: EmpresaConResumen[];
  filtros: FiltrosEmpresas;
  conteoTipos: Record<TipoEmpresa, number>;
  totalSinTipo: number;
  catalogos: Catalogos;
  sectores: string[];
  hayEmpresas: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const { lanzar, dialogos } = useLanzador(catalogos);
  const escritorio = useEscritorio();
  const { visibles: tramo, mas } = useTramos(filas, 50);

  const cambiar = useCallback(
    (c: Partial<FiltrosEmpresas>) => {
      const p = new URLSearchParams(params.toString());
      const siguiente = { ...filtros, ...c };
      for (const [k, v] of Object.entries(c)) {
        const defecto = k === "dir" ? DIR_NATURAL[siguiente.orden] : FILTROS_DEFECTO[k as keyof FiltrosEmpresas];
        if (!v || v === defecto) p.delete(k);
        else p.set(k, String(v));
      }
      if ("orden" in c && !("dir" in c)) p.delete("dir");
      empezar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
    },
    [params, pathname, router, filtros]
  );

  const ordenar = (o: OrdenEmpresa) => {
    if (filtros.orden === o) cambiar({ dir: filtros.dir === "asc" ? "desc" : "asc" });
    else cambiar({ orden: o });
  };

  // Búsqueda con un pequeño retardo para no llenar el historial.
  const [texto, setTexto] = useState(filtros.q);
  const [qUrl, setQUrl] = useState(filtros.q);
  if (filtros.q !== qUrl) {
    setQUrl(filtros.q);
    setTexto(filtros.q);
  }
  useEffect(() => {
    if (texto === filtros.q) return;
    const t = setTimeout(() => cambiar({ q: texto }), 250);
    return () => clearTimeout(t);
  }, [texto, filtros.q, cambiar]);

  const hayFiltros =
    filtros.q ||
    filtros.tipo !== "todos" ||
    filtros.sector !== "todos" ||
    filtros.responsable !== "todos" ||
    filtros.estado !== "todos" ||
    filtros.ops !== "todas";

  return (
    <div className="flex flex-col gap-4">
      <ChipsTipo actual={filtros.tipo} conteo={conteoTipos} total={totalSinTipo} onCambio={(tipo) => cambiar({ tipo })} />

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex h-8 w-full items-center sm:w-64">
          <span className="sr-only">Buscar empresas</span>
          <MagnifyingGlass className="pointer-events-none absolute left-2.5 size-4 text-tinta-2" aria-hidden />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar nombre, web, email, ciudad…"
            className="h-8 w-full rounded-lg border border-linea bg-placa pl-8 pr-2 text-[0.8125rem] text-tinta outline-none placeholder:text-tinta-2 focus:border-acento-tinta focus:ring-2 focus:ring-acento-tinta/20"
          />
        </label>
        <Pildora
          etiqueta="Sector"
          valor={filtros.sector}
          opciones={[{ valor: "todos", texto: "Todos" }, ...sectores.map((s) => ({ valor: s, texto: etiquetaSector(s) }))]}
          onCambio={(sector) => cambiar({ sector })}
        />
        <Pildora
          etiqueta="Responsable"
          valor={filtros.responsable}
          opciones={[
            { valor: "todos", texto: "Todos" },
            { valor: "nadie", texto: "Sin asignar" },
            ...catalogos.equipo.map((m) => ({ valor: m.id, texto: nombreCompleto(m) })),
          ]}
          onCambio={(responsable) => cambiar({ responsable })}
        />
        <Pildora
          etiqueta="Estado"
          valor={filtros.estado}
          opciones={[
            { valor: "todos" as FiltrosEmpresas["estado"], texto: "Todos" },
            ...ESTADOS_EMPRESA.map((e) => ({ valor: e as FiltrosEmpresas["estado"], texto: ETIQUETA_ESTADO_EMPRESA[e] })),
          ]}
          onCambio={(estado) => cambiar({ estado })}
        />
        <Pildora
          etiqueta="Oportunidades"
          valor={filtros.ops}
          opciones={[
            { valor: "todas" as FiltrosEmpresas["ops"], texto: "Cualquiera" },
            ...Object.entries(RANGOS_OPORTUNIDADES).map(([valor, texto]) => ({ valor: valor as FiltrosEmpresas["ops"], texto })),
          ]}
          onCambio={(ops) => cambiar({ ops })}
        />
        <Pildora
          etiqueta="Ordenar"
          valor={filtros.orden}
          opciones={Object.entries(ORDENES_EMPRESA).map(([valor, texto]) => ({ valor: valor as OrdenEmpresa, texto }))}
          onCambio={(orden) => cambiar({ orden })}
        />
        <button
          type="button"
          onClick={() => cambiar({ dir: filtros.dir === "asc" ? "desc" : "asc" })}
          aria-label={filtros.dir === "asc" ? "Orden ascendente; cambiar a descendente" : "Orden descendente; cambiar a ascendente"}
          className="grid size-8 place-items-center rounded-lg bg-placa text-tinta-2 shadow-placa transition-colors hover:bg-placa-2 hover:text-tinta"
        >
          {filtros.dir === "asc" ? <ArrowUp className="size-4" aria-hidden /> : <ArrowDown className="size-4" aria-hidden />}
        </button>

        {hayFiltros && (
          <button
            type="button"
            onClick={() => cambiar({ q: "", tipo: "todos", sector: "todos", responsable: "todos", estado: "todos", ops: "todas" })}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
          >
            <X className="size-3.5" aria-hidden />
            Limpiar
          </button>
        )}

        <div role="radiogroup" aria-label="Vista" className="ml-auto flex h-8 rounded-lg bg-placa p-0.5 shadow-placa">
          {(
            [
              { v: "tabla", texto: "Tabla", Icono: Rows },
              { v: "tarjetas", texto: "Tarjetas", Icono: SquaresFour },
            ] as const
          ).map(({ v, texto: t, Icono }) => {
            const activa = filtros.vista === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={activa}
                onClick={() => cambiar({ vista: v })}
                className={`flex items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium transition-colors ${
                  activa ? "bg-placa-2 text-tinta" : "text-tinta-2 hover:text-tinta"
                }`}
              >
                <Icono className="size-4" weight={activa ? "fill" : "regular"} aria-hidden />
                <span className="hidden sm:inline">{t}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`transition-opacity ${pendiente ? "opacity-70" : ""}`} aria-busy={pendiente}>
        {filas.length === 0 ? (
          hayEmpresas ? (
            <SinDatos
              titulo="Ninguna empresa con estos filtros"
              texto="Prueba a quitar algún filtro o a buscar por otro término."
              accion={
                <button
                  type="button"
                  onClick={() => cambiar({ q: "", tipo: "todos", sector: "todos", responsable: "todos", estado: "todos", ops: "todas" })}
                  className="text-sm font-medium text-acento-tinta hover:underline"
                >
                  Quitar filtros
                </button>
              }
            />
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-2xl bg-placa px-6 py-12 shadow-placa">
              <Buildings className="size-8 text-tinta-2" aria-hidden />
              <p className="text-base font-semibold text-tinta">Aún no hay empresas</p>
              <p className="max-w-md text-sm text-tinta-2">
                Da de alta clientes, proveedores de maquinaria, agua o bebidas, partners y distribuidores. Cada empresa agrupa sus
                contactos, oportunidades y actividad.
              </p>
              <NuevaEmpresa catalogos={catalogos} />
            </div>
          )
        ) : filtros.vista === "tarjetas" || !escritorio ? (
          // En móvil la tabla se convierte en tarjetas.
          <div className="flex flex-col">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {tramo.map((e) => (
                <Tarjeta key={e.id} e={e} lanzar={lanzar} />
              ))}
            </ul>
            {mas}
          </div>
        ) : (
          <div className="flex flex-col">
            <Tabla filas={tramo} filtros={filtros} ordenar={ordenar} lanzar={lanzar} />
            {mas}
          </div>
        )}
      </div>

      {dialogos}
    </div>
  );
}
