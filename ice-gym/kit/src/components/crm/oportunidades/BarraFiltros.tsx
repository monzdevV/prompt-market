"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CaretDown, Check, FunnelSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ETAPAS,
  ETIQUETA_ETAPA,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_TIPO_OPORTUNIDAD,
  PRIORIDADES,
  TIPOS_OPORTUNIDAD,
  nombreCompleto,
} from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { dinero } from "@/lib/formato";
import { LogoEmpresa } from "@/components/crm/b2b/Piezas";
import { CAMPOS_FECHA, DEFECTO, cuantosFiltros, normalizar, type FiltrosOportunidad } from "./filtros";

const clasePildora = (activa: boolean) =>
  `flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta ${
    activa ? "bg-acento-suave" : "bg-placa shadow-placa hover:bg-placa-2"
  }`;

function Cara({ etiqueta, valor, activa }: { etiqueta: string; valor: ReactNode; activa: boolean }) {
  return (
    <>
      <span className="text-tinta-2">{etiqueta}</span>
      <span className={`flex max-w-40 items-center gap-1.5 font-medium ${activa ? "text-acento-tinta" : "text-tinta"}`}>
        <span className="truncate">{valor}</span>
        <CaretDown className="size-3 shrink-0 text-tinta-2" weight="bold" aria-hidden />
      </span>
    </>
  );
}

/** Píldora «Etiqueta | Valor ▾» con opciones fijas. */
function Pildora<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambio,
  neutro,
}: {
  etiqueta: string;
  valor: T;
  opciones: { valor: T; texto: string }[];
  onCambio: (v: T) => void;
  neutro: T;
}) {
  const actual = opciones.find((o) => o.valor === valor)?.texto ?? valor;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={clasePildora(valor !== neutro)} aria-label={`${etiqueta}: ${actual}`}>
          <Cara etiqueta={etiqueta} valor={actual} activa={valor !== neutro} />
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

/** Píldora con buscador, para listas largas (empresas, contactos). */
function PildoraBusqueda({
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string; extra?: string; icono?: ReactNode }[];
  onCambio: (v: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [q, setQ] = useState("");
  const actual = opciones.find((o) => o.valor === valor);
  const n = normalizar(q.trim());
  const visibles = (n ? opciones.filter((o) => normalizar(`${o.texto} ${o.extra ?? ""}`).includes(n)) : opciones).slice(0, 60);

  function elegir(v: string) {
    onCambio(v);
    setAbierta(false);
    setQ("");
  }

  return (
    <Popover open={abierta} onOpenChange={setAbierta}>
      <PopoverTrigger asChild>
        <button type="button" className={clasePildora(!!valor)} aria-label={`${etiqueta}: ${actual?.texto ?? "Todas"}`}>
          <Cara etiqueta={etiqueta} valor={actual?.texto ?? "Todas"} activa={!!valor} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b border-linea p-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && visibles[0]) {
                e.preventDefault();
                elegir(visibles[0].valor);
              }
            }}
            placeholder={`Buscar ${etiqueta.toLowerCase()}…`}
            aria-label={`Buscar ${etiqueta.toLowerCase()}`}
            className="h-8 w-full rounded-md border border-linea bg-placa px-2 text-sm text-tinta outline-none focus:border-acento"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1" role="listbox" aria-label={etiqueta}>
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!valor}
              onClick={() => elegir("")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-tinta-2 hover:bg-placa-2 focus-visible:bg-placa-2 focus-visible:outline-none"
            >
              <Check className={`size-4 ${valor ? "invisible" : ""}`} aria-hidden />
              Todas
            </button>
          </li>
          {visibles.map((o) => (
            <li key={o.valor}>
              <button
                type="button"
                role="option"
                aria-selected={o.valor === valor}
                onClick={() => elegir(o.valor)}
                className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-tinta hover:bg-placa-2 focus-visible:bg-placa-2 focus-visible:outline-none"
              >
                <Check className={`size-4 shrink-0 ${o.valor === valor ? "" : "invisible"}`} aria-hidden />
                {o.icono}
                <span className="min-w-0 flex-1 truncate">{o.texto}</span>
                {o.extra && <span className="shrink-0 truncate text-xs text-tinta-2">{o.extra}</span>}
              </button>
            </li>
          ))}
          {visibles.length === 0 && <li className="px-3 py-4 text-center text-sm text-tinta-2">Sin resultados</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

const claseMini =
  "h-8 w-full rounded-md border border-linea bg-placa px-2 text-sm text-tinta outline-none focus:border-acento focus:ring-2 focus:ring-acento/20";

/** Rango de fechas sobre creación o cierre. */
function PildoraFechas({ f, cambiar }: { f: FiltrosOportunidad; cambiar: (c: Partial<FiltrosOportunidad>) => void }) {
  const activa = !!(f.desde || f.hasta);
  const texto = activa
    ? `${CAMPOS_FECHA[f.fecha]}: ${f.desde ? f.desde.split("-").reverse().join("/") : "…"} – ${f.hasta ? f.hasta.split("-").reverse().join("/") : "…"}`
    : "Cualquiera";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={clasePildora(activa)} aria-label={`Fechas: ${texto}`}>
          <Cara etiqueta="Fecha" valor={texto} activa={activa} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-3">
        <div className="flex rounded-lg border border-linea p-0.5" role="radiogroup" aria-label="Fecha de">
          {(Object.keys(CAMPOS_FECHA) as (keyof typeof CAMPOS_FECHA)[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={f.fecha === c}
              onClick={() => cambiar({ fecha: c })}
              className={`h-7 flex-1 rounded-md text-[0.8125rem] font-medium transition-colors ${
                f.fecha === c ? "bg-placa-2 text-tinta" : "text-tinta-2 hover:text-tinta"
              }`}
            >
              {CAMPOS_FECHA[c]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-tinta-2">
            Desde
            <input type="date" value={f.desde} max={f.hasta || undefined} onChange={(e) => cambiar({ desde: e.target.value })} className={claseMini} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-tinta-2">
            Hasta
            <input type="date" value={f.hasta} min={f.desde || undefined} onChange={(e) => cambiar({ hasta: e.target.value })} className={claseMini} />
          </label>
        </div>
        {activa && (
          <button type="button" onClick={() => cambiar({ desde: "", hasta: "" })} className="self-start text-[0.8125rem] text-tinta-2 hover:text-tinta">
            Quitar fechas
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Rango de valor en euros. Se aplica al pulsar «Aplicar» o Intro. */
function PildoraValor({ f, cambiar }: { f: FiltrosOportunidad; cambiar: (c: Partial<FiltrosOportunidad>) => void }) {
  const [abierta, setAbierta] = useState(false);
  const [min, setMin] = useState(f.vmin);
  const [max, setMax] = useState(f.vmax);
  const activa = !!(f.vmin || f.vmax);
  const texto = activa
    ? f.vmin && f.vmax
      ? `${dinero(f.vmin)} – ${dinero(f.vmax)}`
      : f.vmin
        ? `≥ ${dinero(f.vmin)}`
        : `≤ ${dinero(f.vmax)}`
    : "Cualquiera";

  return (
    <Popover
      open={abierta}
      onOpenChange={(v) => {
        setAbierta(v);
        if (v) {
          setMin(f.vmin);
          setMax(f.vmax);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className={clasePildora(activa)} aria-label={`Valor: ${texto}`}>
          <Cara etiqueta="Valor" valor={texto} activa={activa} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            cambiar({ vmin: min.replace(",", "."), vmax: max.replace(",", ".") });
            setAbierta(false);
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-tinta-2">
              Mínimo (€)
              <input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} className={`${claseMini} tabular-nums`} placeholder="0" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-tinta-2">
              Máximo (€)
              <input inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} className={`${claseMini} tabular-nums`} placeholder="Sin límite" />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                cambiar({ vmin: "", vmax: "" });
                setAbierta(false);
              }}
              className="text-[0.8125rem] text-tinta-2 hover:text-tinta"
            >
              Quitar
            </button>
            <button type="submit" className="h-8 rounded-md bg-acento px-3 text-sm font-medium text-sobre-campo">
              Aplicar
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function BarraFiltros({
  filtros,
  cambiar,
  catalogos,
}: {
  filtros: FiltrosOportunidad;
  cambiar: (c: Partial<FiltrosOportunidad>) => void;
  catalogos: Catalogos;
}) {
  // La búsqueda escribe en la URL con un pequeño retardo.
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

  const empresas = catalogos.empresas.map((e) => ({
    valor: e.id,
    texto: e.nombre,
    icono: <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="xs" />,
  }));
  const contactos = catalogos.contactos
    .filter((c) => !filtros.empresa || c.empresa_id === filtros.empresa)
    .map((c) => ({
      valor: c.id,
      texto: nombreCompleto(c),
      extra: catalogos.empresas.find((e) => e.id === c.empresa_id)?.nombre,
    }));
  const n = cuantosFiltros(filtros);
  // Lo esencial siempre a la vista; empresa, contacto, etapa, fechas y valor,
  // detrás de «Más filtros» (abierto solo si alguno está en uso).
  const extras =
    [filtros.empresa, filtros.contacto, filtros.desde, filtros.hasta, filtros.vmin, filtros.vmax].filter(Boolean).length +
    (filtros.etapa !== DEFECTO.etapa ? 1 : 0);
  const [mas, setMas] = useState(false);
  const verMas = mas || extras > 0;

  return (
    <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filtrar oportunidades">
      <label className="relative flex h-8 w-full items-center sm:w-72">
        <span className="sr-only">Buscar oportunidades</span>
        <MagnifyingGlass className="pointer-events-none absolute left-2.5 size-4 text-tinta-2" aria-hidden />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar oportunidad, empresa, contacto…"
          className="h-8 w-full rounded-lg bg-placa pl-8 pr-2 text-[0.8125rem] text-tinta shadow-placa outline-none placeholder:text-tinta-2 focus:ring-2 focus:ring-acento-tinta/40"
        />
      </label>

      <Pildora
        etiqueta="Responsable"
        valor={filtros.responsable}
        neutro=""
        opciones={[
          { valor: "", texto: "Todos" },
          { valor: "sin", texto: "Sin asignar" },
          ...catalogos.equipo.map((m) => ({ valor: m.id, texto: nombreCompleto(m) })),
        ]}
        onCambio={(responsable) => cambiar({ responsable })}
      />
      <Pildora
        etiqueta="Prioridad"
        valor={filtros.prioridad}
        neutro=""
        opciones={[{ valor: "", texto: "Todas" }, ...PRIORIDADES.map((p) => ({ valor: p, texto: ETIQUETA_PRIORIDAD[p] }))]}
        onCambio={(prioridad) => cambiar({ prioridad })}
      />
      <Pildora
        etiqueta="Tipo"
        valor={filtros.tipo}
        neutro=""
        opciones={[{ valor: "", texto: "Todos" }, ...TIPOS_OPORTUNIDAD.map((t) => ({ valor: t, texto: ETIQUETA_TIPO_OPORTUNIDAD[t] }))]}
        onCambio={(tipo) => cambiar({ tipo })}
      />
      <button
        type="button"
        onClick={() => setMas((m) => !m)}
        aria-expanded={verMas}
        className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-medium transition-colors duration-150 ${
          verMas ? "bg-placa-2 text-tinta" : "text-tinta-2 hover:bg-placa-2 hover:text-tinta"
        }`}
      >
        <FunnelSimple className="size-4" aria-hidden />
        {verMas ? "Menos filtros" : "Más filtros"}
        {extras > 0 && (
          <span className="rounded bg-acento px-1 text-[0.7rem] font-semibold leading-4 text-sobre-campo">{extras}</span>
        )}
      </button>
      {verMas && (
        <>
        <PildoraBusqueda
          etiqueta="Empresa"
          valor={filtros.empresa}
          opciones={empresas}
          onCambio={(empresa) => cambiar({ empresa, contacto: "" })}
        />
        <PildoraBusqueda etiqueta="Contacto" valor={filtros.contacto} opciones={contactos} onCambio={(contacto) => cambiar({ contacto })} />
        <Pildora
          etiqueta="Etapa"
          valor={filtros.etapa}
          neutro="todas"
          opciones={[
            { valor: "todas", texto: "Todas" },
            { valor: "abiertas", texto: "Abiertas" },
            ...ETAPAS.map((e) => ({ valor: e, texto: ETIQUETA_ETAPA[e] })),
          ]}
          onCambio={(etapa) => cambiar({ etapa })}
        />
        <PildoraFechas f={filtros} cambiar={cambiar} />
        <PildoraValor key={`${filtros.vmin}-${filtros.vmax}`} f={filtros} cambiar={cambiar} />
        </>
      )}

      {n > 0 && (
        <button
          type="button"
          onClick={() =>
            cambiar({
              q: "",
              empresa: "",
              contacto: "",
              tipo: "",
              etapa: DEFECTO.etapa,
              responsable: "",
              prioridad: "",
              desde: "",
              hasta: "",
              vmin: "",
              vmax: "",
              fecha: DEFECTO.fecha,
            })
          }
          className="flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
        >
          <X className="size-3.5" aria-hidden />
          Limpiar {n > 1 ? `(${n})` : ""}
        </button>
      )}
    </div>
  );
}
