"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretDown, Check, MagnifyingGlass, SortAscending, SortDescending, X } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LogoEmpresa } from "@/components/crm/b2b/Piezas";
import {
  ESTADOS_CONTACTO,
  ETIQUETA_ESTADO_CONTACTO,
  ETIQUETA_TIPO_CONTACTO,
  ETIQUETA_TIPO_EMPRESA,
  TIPOS_CONTACTO,
  TIPOS_EMPRESA,
  nombreCompleto,
} from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { ORDENES_CONTACTOS, hayFiltrosActivos, type FiltrosContactos } from "./filtros";

const clasePildora =
  "flex h-8 items-stretch overflow-hidden rounded-lg text-[0.8125rem] shadow-placa transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta";

function Cuerpo({ etiqueta, texto, activo }: { etiqueta: string; texto: string; activo: boolean }) {
  return (
    <>
      <span className="flex items-center pl-2.5 text-tinta-2">{etiqueta}</span>
      <span className={`flex max-w-40 items-center gap-1.5 px-2.5 font-medium ${activo ? "text-acento-tinta" : "text-tinta"}`}>
        <span className="truncate">{texto}</span>
        <CaretDown className="size-3 shrink-0 text-tinta-2" weight="bold" aria-hidden />
      </span>
    </>
  );
}

/** Píldora «Etiqueta | Valor ▾». La opción vacía ("") es «Todos». */
function Pildora({
  etiqueta,
  valor,
  opciones,
  onCambio,
  todos = "Todos",
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  onCambio: (v: string) => void;
  todos?: string | null;
}) {
  const lista = todos === null ? opciones : [{ valor: "", texto: todos }, ...opciones];
  const actual = lista.find((o) => o.valor === valor)?.texto ?? valor;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`${clasePildora} ${valor && todos !== null ? "bg-acento-suave" : "bg-placa hover:bg-placa-2"}`}>
          <Cuerpo etiqueta={etiqueta} texto={actual} activo={!!valor && todos !== null} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 min-w-44 overflow-y-auto">
        <DropdownMenuRadioGroup value={valor} onValueChange={onCambio}>
          {lista.map((o) => (
            <DropdownMenuRadioItem key={o.valor || "_"} value={o.valor}>
              {o.texto}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Filtro de empresa con búsqueda: puede haber cientos. */
function PildoraEmpresa({
  empresas,
  valor,
  onCambio,
}: {
  empresas: Catalogos["empresas"];
  valor: string;
  onCambio: (v: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const elegida = empresas.find((e) => e.id === valor);
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? empresas.filter((e) => e.nombre.toLowerCase().includes(t)) : empresas).slice(0, 50);
  }, [empresas, q]);

  function elegir(v: string) {
    onCambio(v);
    setAbierto(false);
    setQ("");
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button type="button" className={`${clasePildora} ${valor ? "bg-acento-suave" : "bg-placa hover:bg-placa-2"}`}>
          <Cuerpo etiqueta="Empresa" texto={elegida?.nombre ?? "Todas"} activo={!!valor} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-1.5 p-1.5">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && visibles[0]) elegir(visibles[0].id);
          }}
          placeholder="Buscar empresa…"
          aria-label="Buscar empresa"
          className="h-8 w-full rounded-md border border-linea bg-placa px-2.5 text-sm text-tinta outline-none placeholder:text-tinta-2 focus:border-acento-tinta"
        />
        <ul className="max-h-64 overflow-y-auto" role="listbox" aria-label="Empresas">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!valor}
              onClick={() => elegir("")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-tinta hover:bg-placa-2"
            >
              <span className="flex-1">Todas las empresas</span>
              {!valor && <Check className="size-3.5" aria-hidden />}
            </button>
          </li>
          {visibles.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                role="option"
                aria-selected={valor === e.id}
                onClick={() => elegir(e.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-tinta hover:bg-placa-2"
              >
                <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="xs" />
                <span className="min-w-0 flex-1 truncate">{e.nombre}</span>
                {valor === e.id && <Check className="size-3.5" aria-hidden />}
              </button>
            </li>
          ))}
          {visibles.length === 0 && <li className="px-2 py-2 text-sm text-tinta-2">Sin resultados.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function BarraFiltrosContactos({
  filtros,
  cambiar,
  catalogos,
  paises,
}: {
  filtros: FiltrosContactos;
  cambiar: (c: Partial<FiltrosContactos>) => void;
  catalogos: Catalogos;
  paises: string[];
}) {
  // Búsqueda con pequeño retardo antes de escribir en la URL.
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

  const Dir = filtros.dir === "asc" ? SortAscending : SortDescending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative flex h-8 w-full items-center sm:w-64">
        <span className="sr-only">Buscar contactos</span>
        <MagnifyingGlass className="pointer-events-none absolute left-2.5 size-4 text-tinta-2" aria-hidden />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre, email, cargo o empresa…"
          className="h-8 w-full rounded-lg border border-linea bg-placa pl-8 pr-2 text-[0.8125rem] text-tinta outline-none placeholder:text-tinta-2 focus:border-acento-tinta focus:ring-2 focus:ring-acento-tinta/20"
        />
      </label>

      <PildoraEmpresa empresas={catalogos.empresas} valor={filtros.empresa} onCambio={(empresa) => cambiar({ empresa })} />
      <Pildora
        etiqueta="Tipo de empresa"
        valor={filtros.tipoEmpresa}
        opciones={TIPOS_EMPRESA.map((t) => ({ valor: t, texto: ETIQUETA_TIPO_EMPRESA[t] }))}
        onCambio={(v) => cambiar({ tipoEmpresa: v as FiltrosContactos["tipoEmpresa"] })}
      />
      <Pildora
        etiqueta="Tipo"
        valor={filtros.tipo}
        opciones={TIPOS_CONTACTO.map((t) => ({ valor: t, texto: ETIQUETA_TIPO_CONTACTO[t] }))}
        onCambio={(v) => cambiar({ tipo: v as FiltrosContactos["tipo"] })}
      />
      <Pildora
        etiqueta="Estado"
        valor={filtros.estado}
        opciones={ESTADOS_CONTACTO.map((e) => ({ valor: e, texto: ETIQUETA_ESTADO_CONTACTO[e] }))}
        onCambio={(v) => cambiar({ estado: v as FiltrosContactos["estado"] })}
      />
      <Pildora
        etiqueta="Responsable"
        valor={filtros.responsable}
        opciones={[
          { valor: "ninguno", texto: "Sin asignar" },
          ...catalogos.equipo.map((m) => ({ valor: m.id, texto: nombreCompleto(m) })),
        ]}
        onCambio={(responsable) => cambiar({ responsable })}
      />
      <Pildora
        etiqueta="Principal"
        valor={filtros.principal}
        opciones={[
          { valor: "si", texto: "Sí" },
          { valor: "no", texto: "No" },
        ]}
        onCambio={(v) => cambiar({ principal: v as FiltrosContactos["principal"] })}
      />
      {paises.length > 1 && (
        <Pildora
          etiqueta="País"
          valor={filtros.pais}
          opciones={paises.map((p) => ({ valor: p, texto: p }))}
          onCambio={(pais) => cambiar({ pais })}
        />
      )}

      {hayFiltrosActivos(filtros) && (
        <button
          type="button"
          onClick={() =>
            cambiar({
              q: "",
              empresa: "",
              tipoEmpresa: "",
              tipo: "",
              estado: "",
              responsable: "",
              principal: "",
              pais: "",
            })
          }
          className="flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
        >
          <X className="size-3.5" aria-hidden />
          Limpiar
        </button>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Pildora
          etiqueta="Ordenar"
          valor={filtros.orden}
          todos={null}
          opciones={Object.entries(ORDENES_CONTACTOS).map(([valor, texto]) => ({ valor, texto }))}
          onCambio={(v) => cambiar({ orden: v as FiltrosContactos["orden"], dir: undefined })}
        />
        <button
          type="button"
          onClick={() => cambiar({ dir: filtros.dir === "asc" ? "desc" : "asc" })}
          aria-label={filtros.dir === "asc" ? "Orden ascendente; cambiar a descendente" : "Orden descendente; cambiar a ascendente"}
          className="grid size-8 place-items-center rounded-lg bg-placa text-tinta-2 shadow-placa transition-colors hover:bg-placa-2 hover:text-tinta"
        >
          <Dir className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

