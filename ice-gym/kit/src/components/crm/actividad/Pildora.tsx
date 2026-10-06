"use client";

import { useState, type ReactNode } from "react";
import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type OpcionPildora = { valor: string; texto: string; icono?: ReactNode };

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const clasePildora =
  "flex h-8 items-stretch overflow-hidden rounded-lg bg-placa text-[0.8125rem] shadow-placa transition-colors hover:bg-placa-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta data-[state=open]:bg-placa-2";

/** Píldora de filtro «Etiqueta | Valor ▾», con buscador si hay muchas opciones. */
export function Pildora({
  etiqueta,
  valor,
  opciones,
  onCambio,
  buscar = opciones.length > 8,
}: {
  etiqueta: string;
  valor: string;
  opciones: OpcionPildora[];
  onCambio: (v: string) => void;
  buscar?: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  const [q, setQ] = useState("");
  const actual = opciones.find((o) => o.valor === valor);
  const t = normal(q.trim());
  const filtradas = t ? opciones.filter((o) => normal(o.texto).includes(t)) : opciones;
  const activa = !!valor && opciones[0]?.valor !== valor;

  return (
    <Popover
      open={abierta}
      onOpenChange={(v) => {
        setAbierta(v);
        if (!v) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className={clasePildora}>
          <span className="flex items-center pl-2.5 text-tinta-2">{etiqueta}</span>
          <span className={`flex max-w-44 items-center gap-1.5 px-2.5 font-medium ${activa ? "text-acento-tinta" : "text-tinta"}`}>
            <span className="truncate">{actual?.texto ?? opciones[0]?.texto}</span>
            <CaretDown className="size-3 shrink-0 text-tinta-2" weight="bold" aria-hidden />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 gap-0 bg-placa p-0 text-tinta shadow-lg">
        {buscar && (
          <label className="flex items-center gap-2 border-b border-linea px-3">
            <MagnifyingGlass className="size-4 shrink-0 text-tinta-2" aria-hidden />
            <span className="sr-only">Buscar {etiqueta.toLowerCase()}</span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="h-9 w-full bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-2"
            />
          </label>
        )}
        <ul className="max-h-72 overflow-y-auto p-1" role="listbox" aria-label={etiqueta}>
          {filtradas.length === 0 && <li className="px-2 py-3 text-sm text-tinta-2">Nada coincide.</li>}
          {filtradas.map((o) => (
            <li key={o.valor} role="option" aria-selected={o.valor === valor}>
              <button
                type="button"
                onClick={() => {
                  onCambio(o.valor);
                  setAbierta(false);
                  setQ("");
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-tinta hover:bg-placa-2 focus-visible:bg-placa-2 focus-visible:outline-none"
              >
                {o.icono}
                <span className="min-w-0 flex-1 truncate">{o.texto}</span>
                {o.valor === valor && <Check className="size-4 shrink-0 text-acento-tinta" weight="bold" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
