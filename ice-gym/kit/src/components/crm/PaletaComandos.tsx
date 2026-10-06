"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AddressBook,
  ArrowSquareOut,
  Buildings,
  ChartBar,
  CheckSquare,
  GearSix,
  Lightning,
  MagnifyingGlass,
  Plus,
  Target,
  User,
  type Icon,
} from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ResultadoBusqueda } from "@/lib/datos/buscar";
import {
  ETIQUETA_ETAPA,
  ETIQUETA_INTERACCION,
  ETIQUETA_TIPO_EMPRESA,
  ETIQUETA_TIPO_OPORTUNIDAD,
  etiquetaSector,
  nombreCompleto,
  ruta,
} from "@/lib/b2b";
import { dinero, fecha } from "@/lib/formato";
import { Avatar, LogoEmpresa } from "@/components/crm/b2b/Piezas";
import { pedirCrear, type TipoCrear } from "@/components/crm/dashboard/eventos";

const SIN_RESULTADOS: ResultadoBusqueda = {
  empresas: [],
  contactos: [],
  oportunidades: [],
  interacciones: [],
};

type Item = {
  id: string;
  grupo: string;
  texto: string;
  detalle?: string;
  Icono: Icon;
  /** Sustituye al icono: logo de empresa o avatar de persona. */
  visual?: React.ReactNode;
  atajo?: string;
  /** Palabras extra con las que también se encuentra el comando. */
  claves?: string;
  ir: () => void;
};

type FilaInteraccion = ResultadoBusqueda["interacciones"][number];

/** Evento para abrir la paleta desde un botón. */
export const EVENTO_PALETA = "crm:paleta";

const sinTildes = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const unir = (...partes: (string | null | undefined)[]) => partes.filter(Boolean).join(" · ");

/** Ficha a la que lleva una actividad o tarea: su oportunidad, empresa o contacto. */
function destinoInteraccion(i: FilaInteraccion) {
  if (i.oportunidad) return ruta.oportunidad(i.oportunidad.id);
  if (i.empresa) return ruta.empresa(i.empresa.id);
  if (i.contacto) return ruta.contacto(i.contacto.id);
  return i.tipo === "tarea" ? ruta.tareas : ruta.actividades;
}

const relacionado = (i: FilaInteraccion) =>
  i.oportunidad?.nombre ?? i.empresa?.nombre ?? (i.contacto ? nombreCompleto(i.contacto) : null);

function escribiendo(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

export function PaletaComandos() {
  const router = useRouter();
  const pathname = usePathname();
  const [abierta, setAbierta] = useState(false);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const [resultados, setResultados] = useState<ResultadoBusqueda>(SIN_RESULTADOS);
  /** Consulta a la que corresponden los resultados: hasta que llegan no se dice «nada coincide». */
  const [respondida, setRespondida] = useState("");
  const [buscando, empezar] = useTransition();
  const lista = useRef<HTMLUListElement>(null);

  // Atajos globales: ⌘K / Ctrl+K y «/» abren la paleta.
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierta((a) => !a);
        return;
      }
      if (escribiendo(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setAbierta(true);
      }
    }
    const abrir = () => setAbierta(true);
    window.addEventListener("keydown", tecla);
    window.addEventListener(EVENTO_PALETA, abrir);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener(EVENTO_PALETA, abrir);
    };
  }, [pathname]);

  // Búsqueda en servidor con un pequeño retardo; cada tecla cancela la petición anterior.
  const consultaValida = q.trim().length >= 2;
  useEffect(() => {
    if (!consultaValida) return;
    const control = new AbortController();
    const t = setTimeout(
      () =>
        empezar(async () => {
          try {
            const res = await fetch(`/crm/buscar?q=${encodeURIComponent(q)}`, { signal: control.signal });
            if (res.ok) {
              setResultados(await res.json());
              setRespondida(q);
            }
          } catch {
            // Cancelada por una tecla nueva o por cerrar la paleta.
          }
        }),
      150,
    );
    return () => {
      clearTimeout(t);
      control.abort();
    };
  }, [q, consultaValida]);
  const encontrados = consultaValida ? resultados : SIN_RESULTADOS;

  const items = useMemo<Item[]>(() => {
    const ir = (href: string) => () => router.push(href);
    const crear = (tipo: TipoCrear) => () => pedirCrear(tipo);
    const fijos: Item[] = [
      { id: "c-oportunidad", grupo: "Crear", texto: "Nueva oportunidad", Icono: Plus, claves: "crear deal venta compra", ir: crear("oportunidad") },
      { id: "c-empresa", grupo: "Crear", texto: "Nueva empresa", Icono: Plus, claves: "crear cuenta proveedor cliente", ir: crear("empresa") },
      { id: "c-contacto", grupo: "Crear", texto: "Nuevo contacto", Icono: Plus, claves: "crear persona", ir: crear("contacto") },
      { id: "c-tarea", grupo: "Crear", texto: "Nueva tarea", Icono: Plus, claves: "crear pendiente recordatorio", ir: crear("tarea") },
      { id: "c-actividad", grupo: "Crear", texto: "Registrar actividad", Icono: Plus, claves: "crear llamada email reunion nota", ir: crear("actividad") },
      { id: "panel", grupo: "Ir a", texto: "Dashboard", Icono: ChartBar, claves: "inicio panel", ir: ir("/crm") },
      { id: "oportunidades", grupo: "Ir a", texto: "Oportunidades", Icono: Target, claves: "pipeline tablero", ir: ir(ruta.oportunidades) },
      { id: "empresas", grupo: "Ir a", texto: "Empresas", Icono: Buildings, claves: "cuentas proveedores clientes", ir: ir(ruta.empresas) },
      { id: "contactos", grupo: "Ir a", texto: "Contactos", Icono: AddressBook, claves: "personas", ir: ir(ruta.contactos) },
      { id: "actividades", grupo: "Ir a", texto: "Actividades", Icono: Lightning, claves: "historial llamadas reuniones", ir: ir(ruta.actividades) },
      { id: "tareas", grupo: "Ir a", texto: "Tareas", Icono: CheckSquare, claves: "pendientes agenda", ir: ir(ruta.tareas) },
      { id: "configuracion", grupo: "Ir a", texto: "Configuración", Icono: GearSix, claves: "ajustes equipo", ir: ir(ruta.configuracion) },
      { id: "web", grupo: "Ir a", texto: "Web pública", Icono: ArrowSquareOut, ir: ir("/") },
    ];
    const palabras = sinTildes(q.trim()).split(/\s+/).filter(Boolean);
    const filtrados = palabras.length
      ? fijos.filter((i) => {
          const pajar = sinTildes(`${i.texto} ${i.claves ?? ""}`);
          return palabras.every((w) => pajar.includes(w));
        })
      : fijos;

    const aInteraccion =
      (grupo: string, Icono: Icon) =>
      (i: FilaInteraccion): Item => ({
        id: `i-${i.id}`,
        grupo,
        texto: i.titulo,
        detalle: unir(
          i.tipo === "tarea" ? (i.estado === "pendiente" ? "Pendiente" : "Completada") : ETIQUETA_INTERACCION[i.tipo],
          relacionado(i),
          fecha(i.fecha),
        ),
        Icono,
        ir: ir(destinoInteraccion(i)),
      });

    return [
      ...encontrados.oportunidades.map<Item>((o) => ({
        id: `o-${o.id}`,
        grupo: "Oportunidades",
        texto: o.nombre,
        detalle: unir(o.empresa?.nombre, ETIQUETA_TIPO_OPORTUNIDAD[o.tipo], ETIQUETA_ETAPA[o.etapa], dinero(o.valor)),
        Icono: Target,
        ir: ir(ruta.oportunidad(o.id)),
      })),
      ...encontrados.empresas.map<Item>((e) => ({
        id: `e-${e.id}`,
        grupo: "Empresas",
        texto: e.nombre,
        detalle: unir(ETIQUETA_TIPO_EMPRESA[e.tipo], etiquetaSector(e.sector), e.ciudad),
        Icono: Buildings,
        visual: <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="xs" />,
        ir: ir(ruta.empresa(e.id)),
      })),
      ...encontrados.contactos.map<Item>((c) => ({
        id: `c-${c.id}`,
        grupo: "Contactos",
        texto: nombreCompleto(c),
        detalle:
          c.cargo || c.empresa
            ? `${c.cargo ?? "Contacto"}${c.empresa ? ` — ${c.empresa.nombre}` : ""}`
            : (c.email ?? undefined),
        Icono: User,
        visual: <Avatar nombre={c.nombre} apellidos={c.apellidos} url={c.avatar_url} tamano="xs" />,
        ir: ir(ruta.contacto(c.id)),
      })),
      ...encontrados.interacciones.filter((i) => i.tipo === "tarea").map(aInteraccion("Tareas", CheckSquare)),
      ...encontrados.interacciones.filter((i) => i.tipo !== "tarea").map(aInteraccion("Actividades", Lightning)),
      ...filtrados,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, encontrados, router, pathname]);

  // Si la lista encoge, el elemento activo no puede quedar fuera.
  const indiceActivo = Math.min(activo, Math.max(0, items.length - 1));
  useEffect(() => {
    lista.current?.querySelector(`[data-indice="${indiceActivo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [indiceActivo]);

  function elegir(i: Item) {
    setAbierta(false);
    setQ("");
    i.ir();
  }

  function teclaLista(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo(Math.min(items.length - 1, indiceActivo + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo(Math.max(0, indiceActivo - 1));
    } else if (e.key === "Enter" && items[indiceActivo]) {
      e.preventDefault();
      elegir(items[indiceActivo]);
    }
  }

  let grupoAnterior = "";

  return (
    <Dialog
      open={abierta}
      onOpenChange={(v) => {
        setAbierta(v);
        if (!v) setQ("");
      }}
    >
      <DialogContent showCloseButton={false} className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[18%] sm:max-w-xl">
        <DialogTitle className="sr-only">Buscar o ir a…</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-linea px-4">
          <MagnifyingGlass className="size-5 text-tinta-2" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActivo(0);
            }}
            onKeyDown={teclaLista}
            placeholder="Busca empresas, contactos, oportunidades… o un comando"
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-lista"
            aria-activedescendant={items[indiceActivo] ? `paleta-${items[indiceActivo].id}` : undefined}
            className="h-12 min-w-0 flex-1 bg-transparent text-[0.95rem] text-tinta outline-none placeholder:text-tinta-2"
          />
          {buscando && <span className="text-xs text-tinta-2">Buscando…</span>}
        </div>
        <ul id="paleta-lista" ref={lista} role="listbox" className="max-h-[55vh] overflow-y-auto p-1.5">
          {items.length === 0 && (!consultaValida || respondida === q) && (
            <li className="px-3 py-6 text-center text-sm text-tinta-2">Nada coincide con «{q}».</li>
          )}
          {items.map((it, i) => {
            const cabecera = it.grupo !== grupoAnterior ? it.grupo : null;
            grupoAnterior = it.grupo;
            return (
              <li key={it.id} role="presentation">
                {cabecera && <p className="px-2.5 pb-1 pt-2.5 text-[0.72rem] font-medium text-tinta-2">{cabecera}</p>}
                <div
                  id={`paleta-${it.id}`}
                  role="option"
                  aria-selected={i === indiceActivo}
                  data-indice={i}
                  onMouseMove={() => setActivo(i)}
                  onClick={() => elegir(it)}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm ${
                    i === indiceActivo ? "bg-placa-2 text-tinta" : "text-tinta"
                  }`}
                >
                  {it.visual ?? <it.Icono className="size-4 shrink-0 text-tinta-2" aria-hidden />}
                  <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                    <span className="truncate">{it.texto}</span>
                    {it.detalle && <span className="truncate text-[0.8125rem] text-tinta-2">{it.detalle}</span>}
                  </span>
                  {it.atajo && (
                    <kbd className="ml-auto rounded border border-linea px-1.5 text-[0.7rem] text-tinta-2">{it.atajo}</kbd>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="hidden gap-4 border-t border-linea px-4 py-2 text-[0.72rem] text-tinta-2 sm:flex">
          <span>↑↓ moverse</span>
          <span>↵ abrir</span>
          <span>Esc cerrar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Botón de búsqueda de la barra superior; `compacto` es sólo la lupa (móvil). */
/**
 * Pantallas con cabecera y buscador propios: en escritorio llevan «Crear» y la
 * búsqueda global en su propia fila y la barra superior desaparece.
 */
export const CON_CABECERA_PROPIA = ["/crm/oportunidades"];
export const tieneCabeceraPropia = (pathname: string) => CON_CABECERA_PROPIA.some((r) => pathname.startsWith(r));

export function BotonPaleta({ compacto = false }: { compacto?: boolean }) {
  const pathname = usePathname();
  const abrir = () => window.dispatchEvent(new Event(EVENTO_PALETA));
  if (compacto || tieneCabeceraPropia(pathname)) {
    return (
      <button
        type="button"
        onClick={abrir}
        aria-label="Buscar en todo el CRM (Ctrl K)"
        title="Buscar en todo el CRM (Ctrl K)"
        className="grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
      >
        <MagnifyingGlass className="size-[18px]" aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={abrir}
      className="flex h-8 w-full max-w-72 items-center gap-2 rounded-lg border border-linea bg-placa px-2.5 text-[0.8125rem] text-tinta-2 transition-colors hover:border-tinta-2/40 hover:text-tinta"
    >
      <MagnifyingGlass className="size-4" aria-hidden />
      <span className="flex-1 text-left">Buscar…</span>
      <kbd className="rounded border border-linea px-1.5 text-[0.7rem]">Ctrl K</kbd>
    </button>
  );
}
