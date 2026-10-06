"use client";

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { CaretUpDown, Check, LockSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type OpcionSelector = { valor: string; texto: string; detalle?: string; icono?: ReactNode };

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Combobox con búsqueda (Popover + lista). Escribe el valor en un input oculto
 * `name` para que viaje en el FormData. Con `fijo` se muestra bloqueado.
 */
export function Selector({
  name,
  valor,
  onCambio,
  opciones,
  placeholder = "Sin elegir",
  vacio = "Nada coincide.",
  fijo = false,
  id,
}: {
  name: string;
  valor: string;
  onCambio: (v: string) => void;
  opciones: OpcionSelector[];
  placeholder?: string;
  vacio?: string;
  fijo?: boolean;
  id?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const lista = useRef<HTMLUListElement>(null);
  const idLista = useId();
  const actual = opciones.find((o) => o.valor === valor);

  const filtradas = useMemo(() => {
    const t = normal(q.trim());
    if (!t) return opciones;
    return opciones.filter((o) => normal(`${o.texto} ${o.detalle ?? ""}`).includes(t));
  }, [opciones, q]);

  function elegir(v: string) {
    onCambio(v);
    setAbierto(false);
    setQ("");
  }

  function teclado(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((a) => Math.min(a + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtradas[activo];
      if (o) elegir(o.valor);
    }
    requestAnimationFrame(() => lista.current?.querySelector("[data-activo=true]")?.scrollIntoView({ block: "nearest" }));
  }

  const caja =
    "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-linea bg-placa px-3 text-left text-sm shadow-xs outline-none transition-[border-color,box-shadow]";

  if (fijo) {
    return (
      <>
        <input type="hidden" name={name} value={valor} />
        <div id={id} className={`${caja} bg-placa-2 text-tinta`} aria-readonly>
          {actual?.icono}
          <span className="min-w-0 flex-1 truncate">{actual?.texto ?? "Vinculado"}</span>
          <LockSimple className="size-3.5 shrink-0 text-tinta-2" aria-label="Fijado" />
        </div>
      </>
    );
  }

  return (
    <>
      <input type="hidden" name={name} value={valor} />
      <Popover
        modal
        open={abierto}
        onOpenChange={(v) => {
          setAbierto(v);
          if (!v) setQ("");
          setActivo(0);
        }}
      >
        <div className="relative">
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              role="combobox"
              aria-expanded={abierto}
              aria-controls={idLista}
              className={`${caja} focus-visible:border-acento-tinta focus-visible:ring-3 focus-visible:ring-acento-tinta/20 ${valor ? "pr-14" : ""}`}
            >
              {actual?.icono}
              <span className={`min-w-0 flex-1 truncate ${actual ? "text-tinta" : "text-tinta-2"}`}>{actual?.texto ?? placeholder}</span>
              <CaretUpDown className="size-3.5 shrink-0 text-tinta-2" aria-hidden />
            </button>
          </PopoverTrigger>
          {valor && (
            <button
              type="button"
              onClick={() => onCambio("")}
              aria-label="Quitar selección"
              className="absolute right-7 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            >
              <X className="size-3" aria-hidden />
            </button>
          )}
        </div>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 gap-0 bg-placa p-0 text-tinta shadow-lg">
          <label className="flex items-center gap-2 border-b border-linea px-3">
            <MagnifyingGlass className="size-4 shrink-0 text-tinta-2" aria-hidden />
            <span className="sr-only">Buscar</span>
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActivo(0);
              }}
              onKeyDown={teclado}
              placeholder="Buscar…"
              aria-controls={idLista}
              aria-activedescendant={filtradas[activo] ? `${idLista}-${activo}` : undefined}
              className="h-9 w-full bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-2"
            />
          </label>
          <ul ref={lista} id={idLista} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {filtradas.length === 0 && <li className="px-2 py-3 text-sm text-tinta-2">{vacio}</li>}
            {filtradas.map((o, n) => (
              <li
                key={o.valor}
                id={`${idLista}-${n}`}
                role="option"
                aria-selected={o.valor === valor}
                data-activo={n === activo}
                onMouseEnter={() => setActivo(n)}
                onClick={() => elegir(o.valor)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[activo=true]:bg-placa-2"
              >
                {o.icono}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-tinta">{o.texto}</span>
                  {o.detalle && <span className="truncate text-xs text-tinta-2">{o.detalle}</span>}
                </span>
                {o.valor === valor && <Check className="size-4 shrink-0 text-acento-tinta" weight="bold" aria-hidden />}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </>
  );
}
