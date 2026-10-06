"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretDown } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { nombreCompleto, type MiembroMini } from "@/lib/b2b";
import { ETIQUETA_PERIODO_DASHBOARD, PERIODOS_DASHBOARD, PERIODO_POR_DEFECTO, type PeriodoDashboard } from "./filtros";

function Pildora({
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  onCambio: (v: string) => void;
}) {
  const actual = opciones.find((o) => o.valor === valor)?.texto ?? valor;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-stretch overflow-hidden rounded-lg border border-linea bg-placa text-[0.8125rem] transition-colors hover:border-tinta-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento"
        >
          <span className="flex items-center border-r border-linea px-2.5 text-tinta-2">{etiqueta}</span>
          <span className="flex items-center gap-1.5 px-2.5 font-medium text-tinta">
            {actual}
            <CaretDown className="size-3 text-tinta-2" weight="bold" aria-hidden />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuRadioGroup value={valor} onValueChange={onCambio}>
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

/** Periodo y responsable, escritos en la URL para poder compartir la vista. */
export function FiltrosDashboard({
  periodo,
  responsable,
  equipo,
}: {
  periodo: PeriodoDashboard;
  responsable: string;
  equipo: MiembroMini[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();

  function cambiar(clave: string, valor: string, porDefecto: string) {
    const p = new URLSearchParams(params.toString());
    if (valor === porDefecto) p.delete(clave);
    else p.set(clave, valor);
    const q = p.toString();
    empezar(() => router.push(q ? `${pathname}?${q}` : pathname, { scroll: false }));
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 transition-opacity ${pendiente ? "opacity-60" : ""}`}>
      <Pildora
        etiqueta="Periodo"
        valor={periodo}
        opciones={PERIODOS_DASHBOARD.map((p) => ({ valor: p, texto: ETIQUETA_PERIODO_DASHBOARD[p] }))}
        onCambio={(v) => cambiar("periodo", v, PERIODO_POR_DEFECTO)}
      />
      {equipo.length > 0 && (
        <Pildora
          etiqueta="Responsable"
          valor={responsable || "todos"}
          opciones={[{ valor: "todos", texto: "Todo el equipo" }, ...equipo.map((m) => ({ valor: m.id, texto: nombreCompleto(m) }))]}
          onCambio={(v) => cambiar("responsable", v, "todos")}
        />
      )}
    </div>
  );
}
